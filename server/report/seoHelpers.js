/** Pure helpers for the executive Search Appearance section. */

export function pathOf(url) {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || '/';
  } catch {
    return String(url || '');
  }
}

export const SEO_INFO_LABELS = {
  'seo-title-long': 'long titles',
  'seo-description-long': 'long descriptions',
  'seo-multiple-h1': 'pages with multiple H1s',
  'seo-missing-canonical': 'pages without a canonical',
  'seo-canonical-relative': 'relative canonicals',
  'seo-canonical-offsite': 'cross-host canonicals',
  'seo-jsonld-missing': 'pages without JSON-LD',
  'seo-missing-lang': 'pages missing html lang',
  'seo-missing-og': 'pages missing Open Graph',
};

export function seoScoreColor(score) {
  if (score < 70) return '#ef4444';
  if (score < 90) return '#f59e0b';
  return '#10b981';
}

/** Collapse info-severity issues into "Also noted: N label · …". */
export function summarizeSeoInfo(issues, labels = SEO_INFO_LABELS) {
  const info = new Map();
  for (const item of issues || []) {
    if (item.severity !== 'info') continue;
    info.set(item.id, (info.get(item.id) || 0) + 1);
  }
  return [...info.entries()].map(([id, n]) => `${n} ${labels[id] || id}`).join(' · ');
}
