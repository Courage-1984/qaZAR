/** Cheap regex fingerprints from HTML the crawler already fetched. */

const RULES = [
  [/wp-content|wp-includes|<meta\s[^>]*name=["']generator["'][^>]*content=["']WordPress/i, 'WordPress'],
  [/cdn\.shopify\.com|Shopify\.theme/i, 'Shopify'],
  [/assets\.website-files\.com|wf-page/i, 'Webflow'],
  [/__NEXT_DATA__|next\/router/i, 'Next.js'],
  [/__NUXT__|nuxt/i, 'Nuxt.js'],
  [/react-dom|react\.production\.min\.js/i, 'React'],
  [/vue\.min\.js|vue\.global/i, 'Vue'],
  [/jquery(?:\.min)?\.js/i, 'jQuery (Legacy)'],
  [/googletagmanager\.com|google-analytics\.com/i, 'Google Analytics/GTM'],
  [/connect\.facebook\.net/i, 'Meta Pixel'],
];

export function detectTechStack(html = '') {
  const tech = new Set();
  for (const [re, label] of RULES) {
    if (re.test(html)) tech.add(label);
  }
  return [...tech];
}

export function classifyFunnelUrl(url = '') {
  return {
    isPricing: /\b(pricing|plans|tier|billing|upgrade)\b/i.test(url),
    isCheckout: /\b(checkout|cart|basket|order|pay)\b/i.test(url),
    isAuth: /\b(signup|register|join|login|signin|auth)\b/i.test(url),
    isContact: /\b(contact|support|help|sales)\b/i.test(url),
  };
}

/** Head scripts with src that are neither async, defer, module, nor JSON-LD. */
export function countBlockingHeadScripts(html = '') {
  const head = (String(html).match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';
  return (head.match(/<script(?![^>]*\b(?:async|defer|type=["']module|type=["']application\/ld\+json))[^>]*src=[^>]*>/gi) || []).length;
}

export function countUnlazyImages(html = '') {
  return (String(html).match(/<img(?![^>]*\bloading\s*=\s*["']lazy["'])[^>]*>/gi) || []).length;
}
