/**
 * Public business contacts from HTML the crawler already fetched.
 * Mailto, tel, JSON-LD Organization/ContactPoint, and booking links only.
 */

import { phoneDigits, scoreLeadHeat } from './leadSignals.js';
import { addUnique, pushContact } from './leadParse.js';
import { pathHasContact, pathHasPricing } from './securityScore.js';
import { emptyLeadLdAcc, readLeadJsonLd } from './leadJsonLd.js';
import {
  collectBookingLinks,
  collectLeadEmails,
  collectLeadPhones,
  collectLeadSocials,
  leadListsFromContacts,
  metaContent,
} from './leadCollect.js';

export function normalizePhone(raw) {
  return phoneDigits(raw);
}

export { scoreLeadHeat };

/**
 * @returns {{ companyName: string, bookingLinks: string[], contacts: object[], emails: string[], phones: string[], socials: string[] }}
 */
export function extractLeads(html = '', url = '') {
  const source = String(html);
  const contacts = [];
  const seen = new Set();
  const ld = readLeadJsonLd(source, emptyLeadLdAcc());
  const companyName = ld.companyName || metaContent(source, 'og:site_name');

  collectLeadEmails(source, url, contacts, seen, ld.emails);
  collectLeadPhones(source, url, contacts, seen, ld.phones);
  collectLeadSocials(source, url, contacts, seen);
  const bookingLinks = collectBookingLinks(source);

  return {
    companyName,
    bookingLinks,
    contacts,
    ...leadListsFromContacts(contacts),
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
