/**
 * ROI (Return-On-Investment) Page Scorer for qaZAR.
 * Ranks and prioritizes crawled URLs so the limited capture quota (max_pages)
 * targets the highest-impact UX templates rather than duplicate/paginated content.
 */

const HIGH_ROI_PATTERNS = [
  { pattern: /^\/?$/, score: 100, label: 'homepage' },
  { pattern: /\b(pricing|plans|tier|billing|upgrade)\b/i, score: 50, label: 'pricing' },
  { pattern: /\b(signup|register|join|login|signin|auth)\b/i, score: 45, label: 'auth' },
  { pattern: /\b(checkout|cart|basket|order|pay)\b/i, score: 45, label: 'checkout' },
  { pattern: /\b(dashboard|app|portal|console)\b/i, score: 40, label: 'app' },
  { pattern: /\b(features|product|solutions|services)\b/i, score: 35, label: 'features' },
  { pattern: /\b(contact|support|help|faq)\b/i, score: 30, label: 'contact' },
  { pattern: /\b(about|team|company|careers)\b/i, score: 25, label: 'about' },
  { pattern: /\b(docs|documentation|guide|api)\b/i, score: 25, label: 'docs' },
];

const PENALTY_PATTERNS = [
  { pattern: /\/(page|p)\/\d+/i, penalty: -40, label: 'pagination-path' },
  { pattern: /[?&](page|p|offset|cursor)=\d+/i, penalty: -40, label: 'pagination-query' },
  { pattern: /\/\d{4}\/\d{2}\//, penalty: -30, label: 'date-archive' },
  { pattern: /\b(tag|category|author)\/[^/]+\/[^/]+/i, penalty: -25, label: 'taxonomy-deep' },
  { pattern: /\b(privacy|terms|legal|cookie|disclaimer)\b/i, penalty: -15, label: 'legal' },
];

/**
 * Calculates an ROI score for a given URL string.
 * @param {string} urlStr
 * @param {Map<string, number>} [seenPrefixes] Track template prefixes to penalize clusters
 * @returns {{ score: number, labels: string[] }}
 */
export function scoreUrl(urlStr, seenPrefixes = new Map()) {
  let score = 50; // base score
  const labels = [];

  try {
    const u = new URL(urlStr);
    const pathname = u.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const depth = segments.length;

    // Depth scoring: shallow pages carry higher brand/layout significance
    if (depth === 0) {
      score += 50;
      labels.push('root');
    } else if (depth === 1) {
      score += 20;
    } else if (depth === 2) {
      score += 10;
    } else if (depth > 4) {
      score -= (depth - 4) * 10;
      labels.push('deep-path');
    }

    // High ROI pattern matches
    for (const { pattern, score: bonus, label } of HIGH_ROI_PATTERNS) {
      if (pattern.test(pathname)) {
        score += bonus;
        labels.push(label);
      }
    }

    // Penalties
    for (const { pattern, penalty, label } of PENALTY_PATTERNS) {
      if (pattern.test(pathname) || pattern.test(u.search)) {
        score += penalty;
        labels.push(label);
      }
    }

    // Diversity penalty: avoid capturing 10 blog posts from the same /blog/ prefix
    if (depth >= 2) {
      const prefix = `/${segments[0]}/`;
      const count = seenPrefixes.get(prefix) || 0;
      if (count > 0) {
        score -= count * 15; // diminishing returns on repeated templates
        labels.push(`cluster-${segments[0]}`);
      }
      seenPrefixes.set(prefix, count + 1);
    }
  } catch {
    score = 0;
  }

  return { score: Math.max(0, score), labels };
}

/**
 * Sorts and selects the top ROI candidates up to maxCount.
 * Guarantees template diversity and high-impact pages.
 * @param {string[]} urls
 * @param {number} maxCount
 * @returns {string[]}
 */
export function selectTopRoiCandidates(urls, maxCount) {
  if (urls.length <= maxCount) return urls;

  const seenPrefixes = new Map();
  const scored = urls.map((url) => ({
    url,
    ...scoreUrl(url, seenPrefixes),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map((item) => item.url);
}
