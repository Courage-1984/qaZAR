/**
 * Lightweight robots.txt parser for polite crawler compliance.
 * Consecutive User-agent lines form one group. Allow wins on an equal or longer match.
 */

function applies(ua) {
  const name = String(ua).toLowerCase();
  return name === '*' || name.includes('qazar');
}

function pathMatches(path, rule) {
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
    } else if (field === 'sitemap') {
      if (val) sitemaps.push(val);
    } else if (field === 'disallow' || field === 'allow' || field === 'crawl-delay') {
      inRules = true;
      if (!agents.some(applies)) continue;
      if (field === 'disallow' && val) disallows.push(val);
      else if (field === 'allow' && val) allows.push(val);
      else if (field === 'crawl-delay') {
        const d = Number.parseFloat(val);
        if (!Number.isNaN(d)) crawlDelay = d;
      }
    }
  }

  return { disallows, allows, sitemaps, crawlDelay };
}

export function isUrlAllowed(urlStr, rules = []) {
  const disallows = Array.isArray(rules) ? rules : rules.disallows || [];
  const allows = Array.isArray(rules) ? [] : rules.allows || [];
  if (!disallows.length && !allows.length) return true;
  let path;
  try {
    path = new URL(urlStr).pathname;
  } catch {
    return true;
  }
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
