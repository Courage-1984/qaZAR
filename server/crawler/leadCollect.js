/** Pure collectors used by extractLeads. */

import { isJunkEmail, phoneDigits } from './leadSignals.js';
import {
  BOOKING_RE, cleanSocial, decodeLeadText, pushContact, roleNear,
} from './leadParse.js';

export function metaContent(html, prop) {
  const want = String(prop || '').toLowerCase();
  for (const tag of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const t = tag[0];
    const property = (t.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (property.toLowerCase() !== want) continue;
    return decodeLeadText((t.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1] || '');
  }
  return '';
}

/** @returns {number} mailto hits kept (for gating bare-email fallback) */
export function collectLeadEmails(source, url, contacts, seen, ldEmails = []) {
  let mailto = 0;
  for (const match of String(source).matchAll(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const value = match[1].toLowerCase();
    if (isJunkEmail(value)) continue;
    mailto++;
    pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
  }
  for (const item of ldEmails) {
    const email = String(item.email || '').replace(/^mailto:/i, '').toLowerCase();
    if (!isJunkEmail(email)) pushContact(contacts, seen, { value: email, kind: 'email', role: item.role || '', page: url });
  }
  if (!mailto) {
    for (const match of String(source).matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,7}\b/gi)) {
      const value = match[0].toLowerCase();
      if (!isJunkEmail(value)) pushContact(contacts, seen, { value, kind: 'email', role: roleNear(source, match.index || 0), page: url });
    }
  }
  return mailto;
}

export function collectLeadPhones(source, url, contacts, seen, ldPhones = []) {
  const phoneRaw = [
    ...String(source).matchAll(/tel:([+\d\s().-]{7,})/gi),
    ...String(source).matchAll(/wa\.me\/(\d{7,15})/gi),
    ...String(source).matchAll(/api\.whatsapp\.com\/send\?[^"'<>]*phone=(\d{7,15})/gi),
    ...ldPhones.map((p) => [p, p]),
  ];
  for (const match of phoneRaw) {
    const value = phoneDigits(match[1]);
    if (value) pushContact(contacts, seen, { value, kind: 'phone', role: '', page: url });
  }
}

export function collectLeadSocials(source, url, contacts, seen) {
  for (const match of String(source).matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    const social = cleanSocial(match[1]);
    if (social) pushContact(contacts, seen, { value: social, kind: 'social', role: '', page: url });
  }
}

export function collectBookingLinks(source) {
  const bookingLinks = [];
  const booked = new Set();
  for (const match of String(source).matchAll(BOOKING_RE)) {
    const value = match[0].replace(/&amp;/g, '&').split(/[?#]/)[0];
    if (booked.has(value)) continue;
    booked.add(value);
    bookingLinks.push(value);
  }
  return bookingLinks.slice(0, 4);
}

export function leadListsFromContacts(contacts = []) {
  const of = (kind) => contacts.filter((c) => c.kind === kind).map((c) => c.value);
  return {
    emails: of('email').slice(0, 5),
    phones: of('phone').slice(0, 3),
    socials: of('social').slice(0, 4),
  };
}
