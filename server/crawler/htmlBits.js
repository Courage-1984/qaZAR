/** Shared HTML / header / robots-meta bits used by SEO (and similar) parsers. */

export function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function attr(tag, name) {
  const m = String(tag).match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2] ?? '') : null;
}

export function headerValue(headers, name) {
  if (!headers) return '';
  const v = typeof headers.get === 'function' ? headers.get(name) : headers[name.toLowerCase()];
  return v ? String(v) : '';
}

/** Drop comments, scripts, and styles before title/meta scans. */
export function stripBoilerplate(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

export function clipText(s, n) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Rules that apply to Google. Agent-scoped rules for other bots are ignored. */
export function robotsTokensFrom(raw) {
  const out = [];
  for (const part of String(raw || '').split(',')) {
    const p = part.trim().toLowerCase();
    if (!p) continue;
    const colon = p.indexOf(':');
    if (colon > 0) {
      const left = p.slice(0, colon).trim();
      const right = p.slice(colon + 1).trim().split(/\s+/)[0];
      if (left === 'googlebot' || left === '*') out.push(right);
    } else {
      out.push(p.split(/\s+/)[0]);
    }
  }
  return out;
}

export function isRobotsBlocked(chunks) {
  const tokens = (chunks || []).flatMap(robotsTokensFrom);
  return tokens.includes('noindex') || tokens.includes('none');
}
