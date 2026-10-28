/** Aggregate transport / header flags into a 0–100 security subscore. */

export function scoreSecurity({
  isHttps = true,
  hasHsts = true,
  hasCsp = true,
  insecureFormsCount = 0,
} = {}) {
  let score = 100;
  const flags = [];
  if (!isHttps) { score -= 40; flags.push('Insecure HTTP'); }
  if (!hasHsts) { score -= 20; flags.push('Missing HSTS'); }
  if (!hasCsp) { score -= 15; flags.push('Missing CSP'); }
  if (insecureFormsCount > 0) { score -= 20; flags.push('Insecure Form Submission'); }
  return { score: Math.max(0, score), flags, measured: true };
}

/** Path tokens that boost lead heat via hasContact / hasPricing. */
export function pathHasContact(url = '') {
  return /\/(contact|team|book(?:ing)?|demo)\b/i.test(url || '');
}

export function pathHasPricing(url = '') {
  return /\b(pricing|plans)\b/i.test(url || '');
}
