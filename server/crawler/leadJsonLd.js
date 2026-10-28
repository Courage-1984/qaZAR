import { ROLE_HINTS, asStringList, decodeLeadText } from './leadParse.js';

const JSON_LD_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Walk Organization / LocalBusiness / ContactPoint nodes into acc. */
export function walkLeadLd(node, acc, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) walkLeadLd(item, acc, seen);
    return;
  }
  const types = [].concat(node['@type'] || []).map((t) => String(t).toLowerCase());
  const org = types.some((t) => t.includes('organization') || t.includes('localbusiness'));
  const point = types.some((t) => t.includes('contactpoint'));
  if (org && node.name && !acc.companyName) acc.companyName = decodeLeadText(node.name);
  const role = point ? (ROLE_HINTS.find((r) => String(node.name || '').toLowerCase().includes(r)) || '') : '';
  if (org || point) {
    for (const email of asStringList(node.email)) acc.emails.push({ email: String(email), role });
    for (const phone of asStringList(node.telephone)) acc.phones.push(String(phone));
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') walkLeadLd(value, acc, seen);
  }
}

export function emptyLeadLdAcc() {
  return { companyName: '', emails: [], phones: [] };
}

export function readLeadJsonLd(html, acc = emptyLeadLdAcc()) {
  for (const match of String(html).matchAll(JSON_LD_RE)) {
    try { walkLeadLd(JSON.parse(match[1]), acc); } catch { /* invalid block */ }
  }
  return acc;
}
