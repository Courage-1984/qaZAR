/**
 * Lightweight robots.txt parser for polite crawler compliance.
 * Consecutive User-agent lines form one group. Allow wins on an equal or longer match.
 */

export function appliesToQazar(ua) {
  const name = String(ua).toLowerCase();
  return name === '*' || name.includes('qazar');
}

export function pathMatches(path, rule) {
  if (!rule) return false;
  if (rule === '/') return true;
  return path.startsWith(rule);
}

export function parseRobotsTxt(content = '') {
  const disallows = [];
  const allows = [];
  const sitemaps = [];
  let crawlDelay = 0;
  let agents = [];
  let inRules = false;

  for (const rawLine of String(content).split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) {
      agents = [];
      inRules = false;
      continue;
    }
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (inRules) agents = [];
      inRules = false;
      agents.push(val);
      continue;
    }
    if (field === 'sitemap') {
      if (val) sitemaps.push(val);
      continue;
    }
    if (field !== 'disallow' && field !== 'allow' && field !== 'crawl-delay') continue;
    inRules = true;
    if (!agents.some(appliesToQazar)) continue;
    if (field === 'disallow' && val) disallows.push(val);
    else if (field === 'allow' && val) allows.push(val);
    else if (field === 'crawl-delay') {
      const d = Number.parseFloat(val);
      if (!Number.isNaN(d)) crawlDelay = d;
    }
  }

  return { disallows, allows, sitemaps, crawlDelay };
}

/** Longest matching rule wins; allow ties or beats disallow length. */
export function decidePathAccess(path, disallows = [], allows = []) {
  if (!disallows.length && !allows.length) return true;
  let bestLen = -1;
  let allowed = true;
  for (const rule of disallows) {
    if (pathMatches(path, rule) && rule.length > bestLen) {
      bestLen = rule.length;
      allowed = false;
    }
  }
  for (const rule of allows) {
    if (pathMatches(path, rule) && rule.length >= bestLen) {
      bestLen = rule.length;
      allowed = true;
    }
  }
  return allowed;
}

export function isUrlAllowed(urlStr, rules = []) {
  const disallows = Array.isArray(rules) ? rules : rules.disallows || [];
  const allows = Array.isArray(rules) ? [] : rules.allows || [];
  let path;
  try {
    path = new URL(urlStr).pathname;
  } catch {
    return true;
  }
  return decidePathAccess(path, disallows, allows);
}
