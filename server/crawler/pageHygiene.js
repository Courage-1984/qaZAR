/** Cheap HTML / header hygiene signals gathered during crawl. */

export function readPageMeta(html = '') {
  const src = String(html);
  return {
    hasViewportMeta: /<meta\s[^>]*name\s*=\s*["']viewport["']/i.test(src),
    hasTitle: /<title[^>]*>[\s\S]+?<\/title>/i.test(src),
    hasDescription: /<meta\s[^>]*name\s*=\s*["']description["']/i.test(src),
    hasOpenGraph: /<meta\s[^>]*property\s*=\s*["']og:image["']/i.test(src)
      && /<meta\s[^>]*property\s*=\s*["']og:title["']/i.test(src),
    hasCanonical: /<link\s[^>]*rel\s*=\s*["']canonical["']/i.test(src),
  };
}

export function codeHygieneOf(html = '') {
  const src = String(html);
  return {
    legacyTags: (src.match(/<(?:center|font|marquee|blink)\b/gi) || []).length,
    missingAltImages: (src.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi) || []).length,
    hasFavicon: /<link\s[^>]*rel\s*=\s*["'](?:shortcut )?icon["']/i.test(src),
  };
}

export function countWebFonts(html = '') {
  return (String(html).match(/fonts\.(?:googleapis|gstatic)\.com|use\.typekit\.net/gi) || []).length;
}

export function hasLeadForm(html = '') {
  return /<form[^>]*>[\s\S]*?<input[^>]*(?:type=["'](?:email|tel)["']|name=["'](?:email|phone|contact|lead)["'])[\s\S]*?<\/form>/i.test(String(html));
}

export function insecureFormCount(url = '', html = '') {
  return (String(url).startsWith('https:') && /<form[^>]*action=["']http:\/\//i.test(String(html))) ? 1 : 0;
}

export function securityFromUrlHeaders(url, getHeader) {
  const getH = typeof getHeader === 'function' ? getHeader : () => null;
  return {
    isHttps: String(url || '').startsWith('https:'),
    hasHsts: Boolean(getH('strict-transport-security')),
    hasCsp: Boolean(getH('content-security-policy')),
    hasXFrame: Boolean(getH('x-frame-options')),
  };
}
