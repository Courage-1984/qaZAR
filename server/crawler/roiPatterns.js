/** Path / query patterns that boost or penalise ROI page selection. */

export const HIGH_ROI_PATTERNS = [
  { pattern: /^\/?$/, score: 100, label: 'homepage' },
  { pattern: /\b(pricing|plans|tier|billing|upgrade)\b/i, score: 50, label: 'pricing' },
  { pattern: /\b(signup|register|join|login|signin|auth)\b/i, score: 45, label: 'auth' },
  { pattern: /\b(checkout|cart|basket|order|pay)\b/i, score: 45, label: 'checkout' },
  { pattern: /\b(dashboard|app|portal|console)\b/i, score: 40, label: 'app' },
  { pattern: /\b(features|product|solutions|services)\b/i, score: 35, label: 'features' },
  { pattern: /\b(contact|support|help|faq)\b/i, score: 40, label: 'contact' },
  { pattern: /\b(team|people|staff)\b/i, score: 40, label: 'team' },
  { pattern: /\b(book|booking|demo|schedule)\b/i, score: 40, label: 'book' },
  { pattern: /\b(about|company|careers)\b/i, score: 25, label: 'about' },
  { pattern: /\b(docs|documentation|guide|api)\b/i, score: 25, label: 'docs' },
];

export const PENALTY_PATTERNS = [
  { pattern: /\/(page|p)\/\d+/i, penalty: -40, label: 'pagination-path' },
  { pattern: /[?&](page|p|offset|cursor)=\d+/i, penalty: -40, label: 'pagination-query' },
  { pattern: /\/\d{4}\/\d{2}\//, penalty: -30, label: 'date-archive' },
  { pattern: /\b(tag|category|author)\/[^/]+\/[^/]+/i, penalty: -25, label: 'taxonomy-deep' },
  { pattern: /\b(privacy|terms|legal|cookie|disclaimer)\b/i, penalty: -15, label: 'legal' },
];

const LEAD_LABELS = new Set(['contact', 'team', 'book']);

/** Apply high-ROI and penalty patterns to a path (+ search for query penalties). */
export function applyRoiPatterns(pathname, search = '') {
  let delta = 0;
  const labels = [];
  for (const { pattern, score, label } of HIGH_ROI_PATTERNS) {
    if (pattern.test(pathname)) {
      delta += score;
      labels.push(label);
    }
  }
  for (const { pattern, penalty, label } of PENALTY_PATTERNS) {
    if (pattern.test(pathname) || pattern.test(search)) {
      delta += penalty;
      labels.push(label);
    }
  }
  return { delta, labels };
}

/** Prefer homepage then a lead page, then highest scores, without exceeding maxCount. */
export function pickRoiCandidates(scored, maxCount) {
  const picked = [];
  const take = (item) => {
    if (item && !picked.includes(item) && picked.length < maxCount) picked.push(item);
  };
  take(scored.find((s) => s.labels.includes('homepage') || s.labels.includes('root')));
  const leadPages = scored.filter((s) => s.labels.some((l) => LEAD_LABELS.has(l)));
  take(leadPages[0]);
  for (const item of scored) take(item);
  return picked.map((item) => item.url);
}
