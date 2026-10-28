/**
 * Public business contacts from HTML the crawler already fetched.
 * Mailto, tel, JSON-LD Organization/ContactPoint, and booking links only.
 */

import { isJunkEmail, phoneDigits, scoreLeadHeat } from './leadSignals.js';
import {
  BOOKING_RE,
  addUnique,
  cleanSocial,
  decodeLeadText,
  pushContact,
  roleNear,
} from './leadParse.js';
import { pathHasContact, pathHasPricing } from './securityScore.js';
import { emptyLeadLdAcc, readLeadJsonLd } from './leadJsonLd.js';

export function normalizePhone(raw) {
  return phoneDigits(raw);
}

export { scoreLeadHeat };

function metaContent(html, prop) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const t = tag[0];
    const property = (t.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (property.toLowerCase() !== prop) continue;
    return decodeLeadText((t.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1] || '');
  }
  return '';
}

/**
 * @returns {{ companyName: string, bookingLinks: string[], contacts: object[], emails: string[], phones: string[], socials: string[] }}
 */
export function extractLeads(html = '', url = '') {
  const source = String(html);
  const contacts = [];
  const seen = new Set();
  const ld = readLeadJsonLd(source, emptyLeadLdAcc());
  const companyName = ld.companyName || metaContent(source, 'og:site_name');

  let mailto = 0;
  for (const match of source.matchAll(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const value = match[1].toLowerCase();
    if (isJunkEmail(value)) continue;
    mailto++;
    pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
  }
  for (const item of ld.emails) {
    const email = String(item.email || '').replace(/^mailto:/i, '').toLowerCase();
    if (!isJunkEmail(email)) pushContact(contacts, seen, { value: email, kind: 'email', role: item.role || '', page: url });
  }
  if (!mailto) {
    for (const match of source.matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,7}\b/gi)) {
      const value = match[0].toLowerCase();
      if (!isJunkEmail(value)) pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
    }
  }

  const phoneRaw = [
    ...source.matchAll(/tel:([+\d\s().-]{7,})/gi),
    ...source.matchAll(/wa\.me\/(\d{7,15})/gi),
    ...source.matchAll(/api\.whatsapp\.com\/send\?[^"'<>]*phone=(\d{7,15})/gi),
    ...ld.phones.map((p) => [p, p]),
  ];
  for (const match of phoneRaw) {
    const value = normalizePhone(match[1]);
    if (value) pushContact(contacts, seen, { value, kind: 'phone', role: '', page: url });
  }

  for (const match of source.matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    const social = cleanSocial(match[1]);
    if (social) pushContact(contacts, seen, { value: social, kind: 'social', role: '', page: url });
  }

  const bookingLinks = [];
  const booked = new Set();
  for (const match of source.matchAll(BOOKING_RE)) {
    const value = match[0].replace(/&amp;/g, '&').split(/[?#]/)[0];
    if (booked.has(value)) continue;
    booked.add(value);
    bookingLinks.push(value);
  }

  const of = (kind) => contacts.filter((c) => c.kind === kind).map((c) => c.value);
  return {
    companyName,
    bookingLinks: bookingLinks.slice(0, 4),
    contacts,
    emails: of('email').slice(0, 5),
    phones: of('phone').slice(0, 3),
    socials: of('social').slice(0, 4),
  };
}

const crawledUrls = new WeakMap();

function rememberUrl(profile, url) {
  const list = crawledUrls.get(profile) || [];
  if (url && !list.includes(url)) list.push(url);
  crawledUrls.set(profile, list);
  return list;
}

/** Union one page of lead fields into a site profile. */
export function unionLeads(profile, leads, url = '') {
  if (!profile || !leads) return profile;
  const lc = profile.leadContacts || (profile.leadContacts = { emails: [], phones: [], socials: [], contacts: [] });
  lc.contacts = lc.contacts || [];
  const seen = new Set(lc.contacts.map((c) => `${c.kind}:${String(c.value).toLowerCase()}`));
  for (const contact of leads.contacts || []) {
    pushContact(lc.contacts, seen, { ...contact, page: contact.page || url });
  }
  lc.emails = lc.contacts.filter((c) => c.kind === 'email').map((c) => c.value).slice(0, 8);
  lc.phones = lc.contacts.filter((c) => c.kind === 'phone').map((c) => c.value).slice(0, 6);
  lc.socials = lc.contacts.filter((c) => c.kind === 'social').map((c) => c.value).slice(0, 6);
  if (!profile.companyName && leads.companyName) profile.companyName = leads.companyName;
  profile.bookingLinks = profile.bookingLinks || [];
  for (const link of leads.bookingLinks || []) addUnique(profile.bookingLinks, link);
  const pages = rememberUrl(profile, url);
  profile.leadHeat = scoreLeadHeat({
    emails: lc.emails,
    phones: lc.phones,
    bookingLinks: profile.bookingLinks,
    hasLeadForm: Boolean(profile.funnel?.hasLeadForm),
    hasContact: pages.some(pathHasContact),
    hasPricing: Boolean(profile.funnel?.hasPricing) || pages.some(pathHasPricing),
  });
  return profile;
}
