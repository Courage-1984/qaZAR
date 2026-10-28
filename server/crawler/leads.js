/**
 * Public business contacts from HTML the crawler already fetched.
 * Mailto, tel, JSON-LD Organization/ContactPoint, and booking links only.
 */

import { isJunkEmail, phoneDigits, scoreLeadHeat } from './leadSignals.js';

const ROLES = ['founder', 'sales', 'support', 'press'];
const SOCIAL_HOSTS = ['linkedin.com', 'twitter.com', 'x.com', 'github.com', 'instagram.com'];
const BOOKING = /https?:\/\/(?:[\w.-]+\.)?(?:calendly\.com|cal\.com|savvycal\.com|meetings\.hubspot\.com|hubspot\.com\/meetings)\/[^\s"'<>]+/gi;

function decode(s) {
  return String(s || '').replace(/&amp;/gi, '&').replace(/&#0?39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();
}

export function normalizePhone(raw) {
  return phoneDigits(raw);
}

function junkEmail(email) {
  return isJunkEmail(email);
}

export { scoreLeadHeat };

function roleNear(html, index) {
  const slice = html.slice(Math.max(0, index - 180), index + 80).replace(/<[^>]+>/g, ' ').toLowerCase();
  return ROLES.find((role) => slice.includes(role)) || '';
}

function pushContact(list, seen, contact) {
  const key = `${contact.kind}:${contact.value.toLowerCase()}`;
  if (!contact.value || list.length >= 12) return;
  if (seen.has(key)) {
    const prev = list.find((c) => `${c.kind}:${c.value.toLowerCase()}` === key);
    if (prev && !prev.role && contact.role) prev.role = contact.role;
    return;
  }
  seen.add(key);
  list.push(contact);
}

function readJsonLd(html, acc) {
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    try { walkLd(JSON.parse(match[1]), acc); } catch { /* invalid block */ }
  }
}

function asList(value) {
  return [].concat(value || []).filter((v) => typeof v === 'string' || typeof v === 'number');
}

function walkLd(node, acc, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) walkLd(item, acc, seen);
    return;
  }
  const types = [].concat(node['@type'] || []).map((t) => String(t).toLowerCase());
  const org = types.some((t) => t.includes('organization') || t.includes('localbusiness'));
  const point = types.some((t) => t.includes('contactpoint'));
  if (org && node.name && !acc.companyName) acc.companyName = decode(node.name);
  const role = point ? (ROLES.find((r) => String(node.name || '').toLowerCase().includes(r)) || '') : '';
  if (org || point) {
    for (const email of asList(node.email)) acc.emails.push({ email: String(email), role });
    for (const phone of asList(node.telephone)) acc.phones.push(String(phone));
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') walkLd(value, acc, seen);
  }
}

function metaContent(html, prop) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const t = tag[0];
    const property = (t.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (property.toLowerCase() !== prop) continue;
    return decode((t.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1] || '');
  }
  return '';
}

function cleanSocial(raw) {
  if (/\/share(?:[/?#]|$)|intent\/tweet|sharer\.php|sharing\/share/i.test(raw)) return '';
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    if (!SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return '';
    if (!u.pathname || u.pathname === '/') return '';
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * @returns {{ companyName: string, bookingLinks: string[], contacts: object[], emails: string[], phones: string[], socials: string[] }}
 */
export function extractLeads(html = '', url = '') {
  const source = String(html);
  const contacts = [];
  const seen = new Set();
  const ld = { companyName: '', emails: [], phones: [] };
  readJsonLd(source, ld);
  const companyName = ld.companyName || metaContent(source, 'og:site_name');

  let mailto = 0;
  for (const match of source.matchAll(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const value = match[1].toLowerCase();
    if (junkEmail(value)) continue;
    mailto++;
    pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
  }
  for (const item of ld.emails) {
    const email = String(item.email || '').replace(/^mailto:/i, '').toLowerCase();
    if (!junkEmail(email)) pushContact(contacts, seen, { value: email, kind: 'email', role: item.role || '', page: url });
  }
  if (!mailto) {
    for (const match of source.matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,7}\b/gi)) {
      const value = match[0].toLowerCase();
      if (!junkEmail(value)) pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
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
  for (const match of source.matchAll(BOOKING)) {
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

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
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
    hasContact: pages.some((p) => /\/(contact|team|book(?:ing)?|demo)\b/i.test(p || '')),
    hasPricing: Boolean(profile.funnel?.hasPricing) || pages.some((p) => /\b(pricing|plans)\b/i.test(p || '')),
  });
  return profile;
}
