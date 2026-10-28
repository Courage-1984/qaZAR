const JUNK_EMAIL = /noreply|no-reply|sentry|wixpress|wix\.com|example\.|schema\.org|w3\.org|cloudflare|godaddy|u003e|\.(?:png|jpe?g|gif|svg|css|js)$/i;

/** True when an address is malformed or a known non-business mailbox. */
export function isJunkEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e)) return true;
  return JUNK_EMAIL.test(e);
}

/** Digits-only phone body after stripping tel: and punctuation. Empty when invalid. */
export function phoneDigits(raw) {
  const trimmed = String(raw || '').trim().replace(/^tel:/i, '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  if (/^0+$/.test(digits) || /^(\d)\1{6,}$/.test(digits)) return '';
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** Public contact heat score capped at 100. */
export function scoreLeadHeat({
  emails = [], phones = [], bookingLinks = [], hasLeadForm = false, hasContact = false, hasPricing = false,
} = {}) {
  let heat = 0;
  if (emails.length) heat += 30;
  if (phones.length) heat += 20;
  if (hasLeadForm) heat += 15;
  if (bookingLinks.length) heat += 15;
  if (hasContact) heat += 10;
  if (hasPricing) heat += 10;
  return Math.min(100, heat);
}
