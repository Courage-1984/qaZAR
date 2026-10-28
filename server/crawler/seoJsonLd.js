/** Collect @type strings from application/ld+json blocks (SEO surface). */

const JSON_LD_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function collectSeoLdTypes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectSeoLdTypes(item, out);
    return out;
  }
  const t = node['@type'];
  if (typeof t === 'string') out.push(t);
  else if (Array.isArray(t)) for (const item of t) if (typeof item === 'string') out.push(item);
  if (node['@graph']) collectSeoLdTypes(node['@graph'], out);
  return out;
}

/**
 * @returns {{ blocks: number, invalid: boolean, types: string[] }}
 */
export function readSeoJsonLd(html) {
  const types = [];
  let blocks = 0;
  let invalid = false;
  for (const m of String(html).matchAll(JSON_LD_RE)) {
    blocks++;
    try {
      collectSeoLdTypes(JSON.parse(m[1]), types);
    } catch {
      invalid = true;
    }
  }
  return { blocks, invalid, types: [...new Set(types)].slice(0, 8) };
}
