/**
 * Lightweight robots.txt parser for polite crawler compliance.
 */

export function parseRobotsTxt(content = '') {
  const disallows = [];
  const sitemaps = [];
  let isTargetAgent = false;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const [key, ...vals] = line.split(':');
    const field = key.trim().toLowerCase();
    const val = vals.join(':').trim();

    if (field === 'user-agent') {
      const ua = val.toLowerCase();
      isTargetAgent = ua === '*' || ua.includes('qazar');
    } else if (field === 'disallow' && isTargetAgent) {
      if (val) disallows.push(val);
    } else if (field === 'sitemap') {
      sitemaps.push(val);
    }
  }

  return { disallows, sitemaps };
}

export function isUrlAllowed(urlStr, disallows = []) {
  if (!disallows.length) return true;
  try {
    const path = new URL(urlStr).pathname;
    return !disallows.some((disallow) => {
      if (disallow === '/') return true;
      return path.startsWith(disallow);
    });
  } catch {
    return true;
  }
}
