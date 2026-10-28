/** Pure contact-parsing helpers used by extractLeads / unionLeads. */

export const ROLE_HINTS = ['founder', 'sales', 'support', 'press'];
export const SOCIAL_HOSTS = ['linkedin.com', 'twitter.com', 'x.com', 'github.com', 'instagram.com'];
export const BOOKING_RE = /https?:\/\/(?:[\w.-]+\.)?(?:calendly\.com|cal\.com|savvycal\.com|meetings\.hubspot\.com|hubspot\.com\/meetings)\/[^\s"'<>]+/gi;

/** Light entity decode for mailto / meta / JSON-LD name fields. */
export function decodeLeadText(s) {
  return String(s || '').replace(/&amp;/gi, '&').replace(/&#0?39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();
}

export function roleNear(html, index) {
  const slice = String(html || '').slice(Math.max(0, index - 180), index + 80).replace(/<[^>]+>/g, ' ').toLowerCase();
  return ROLE_HINTS.find((role) => slice.includes(role)) || '';
}

export function pushContact(list, seen, contact) {
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

export function asStringList(value) {
  return [].concat(value || []).filter((v) => typeof v === 'string' || typeof v === 'number');
}

/** Drop share/intent URLs; keep company profile paths on known hosts. */
export function cleanSocial(raw) {
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

export function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}
