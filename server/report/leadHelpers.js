/** Pure helpers for the executive lead-contacts section. */

const NOT_SALES = /privacy|complaint|regulator|ico\.|gdpr|abuse@|legal@|dpo@/i;

export function isNotSalesContact(value) {
  return NOT_SALES.test(String(value || ''));
}

/** Prefer rich contact objects; otherwise flatten emails/phones/socials. */
export function leadContactRows(profile) {
  const rich = profile?.leadContacts?.contacts || [];
  if (rich.length) return rich;
  const lc = profile?.leadContacts || {};
  return [
    ...(lc.emails || []).map((value) => ({ value, kind: 'email', role: '', page: '' })),
    ...(lc.phones || []).map((value) => ({ value, kind: 'phone', role: '', page: '' })),
    ...(lc.socials || []).map((value) => ({ value, kind: 'social', role: '', page: '' })),
  ];
}

export function contactKindLabel(kind) {
  if (kind === 'phone') return 'Phone';
  if (kind === 'social') return 'Social';
  return 'Email';
}
