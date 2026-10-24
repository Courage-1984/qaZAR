/**
 * Lightweight, zero-overhead site profiler for extracting high-value ROI signals,
 * tech debt, and hot lead contact data directly during crawl time.
 */

/**
 * Extracts metadata, tech stack clues, performance signals, and public contact info from HTML.
 * @param {string} html
 * @param {string} url
 * @param {number} responseTimeMs
 * @returns {object}
 */
export function extractCrawlSignals(html = '', url = '', responseTimeMs = 0, headers = null) {
  const getH = (name) => {
    if (!headers) return null;
    return typeof headers.get === 'function' ? headers.get(name) : headers[name.toLowerCase()] || null;
  };

  const signals = {
    url,
    responseTimeMs,
    htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
    hasViewportMeta: false,
    hasTitle: false,
    hasDescription: false,
    hasOpenGraph: false,
    techStack: [],
    security: {
      isHttps: url.startsWith('https:'),
      hasHsts: Boolean(getH('strict-transport-security')),
      hasCsp: Boolean(getH('content-security-policy')),
      hasXFrame: Boolean(getH('x-frame-options')),
    },
    performance: {
      compressed: Boolean(getH('content-encoding')),
      unlazyImages: (html.match(/<img(?![^>]*\bloading\s*=\s*["']lazy["'])[^>]*>/gi) || []).length,
    },
    contacts: {
      emails: [],
      phones: [],
      socials: [],
    },
  };

  // 1. Meta & SEO hygiene
  signals.hasViewportMeta = /<meta\s[^>]*name\s*=\s*["']viewport["']/i.test(html);
  signals.hasTitle = /<title[^>]*>[\s\S]+?<\/title>/i.test(html);
  signals.hasDescription = /<meta\s[^>]*name\s*=\s*["']description["']/i.test(html);
  signals.hasOpenGraph = /<meta\s[^>]*property\s*=\s*["']og:/i.test(html);

  // 2. Tech stack fingerprinting (cheap regex on scripts, meta generators, classes)
  const tech = new Set();
  if (/wp-content|wp-includes|<meta\s[^>]*name=["']generator["'][^>]*content=["']WordPress/i.test(html)) {
    tech.add('WordPress');
  }
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) {
    tech.add('Shopify');
  }
  if (/assets\.website-files\.com|wf-page/i.test(html)) {
    tech.add('Webflow');
  }
  if (/__NEXT_DATA__|next\/router/i.test(html)) {
    tech.add('Next.js');
  }
  if (/__NUXT__|nuxt/i.test(html)) {
    tech.add('Nuxt.js');
  }
  if (/react-dom|react\.production\.min\.js/i.test(html)) {
    tech.add('React');
  }
  if (/vue\.min\.js|vue\.global/i.test(html)) {
    tech.add('Vue');
  }
  if (/jquery(?:\.min)?\.js/i.test(html)) {
    tech.add('jQuery (Legacy)');
  }
  if (/googletagmanager\.com|google-analytics\.com/i.test(html)) {
    tech.add('Google Analytics/GTM');
  }
  if (/connect\.facebook\.net/i.test(html)) {
    tech.add('Meta Pixel');
  }
  signals.techStack = [...tech];

  // 3. Hot Lead Contact Extraction
  const emails = new Set();
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)) {
    const email = m[1].toLowerCase();
    if (!email.includes('example') && !email.includes('sentry') && !email.endsWith('.png')) {
      emails.add(email);
    }
  }
  // Fallback direct regex for email patterns in text
  if (emails.size === 0) {
    const rawMatches = html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g) || [];
    for (const e of rawMatches.slice(0, 3)) {
      if (!e.includes('example') && !e.includes('schema.org') && !e.includes('w3.org')) {
        emails.add(e.toLowerCase());
      }
    }
  }
  signals.contacts.emails = [...emails].slice(0, 5);

  const phones = new Set();
  for (const m of html.matchAll(/tel:([+\d\s().-]{7,})/gi)) {
    phones.add(m[1].trim());
  }
  signals.contacts.phones = [...phones].slice(0, 3);

  const socials = new Set();
  for (const m of html.matchAll(/href\s*=\s*["'](https?:\/\/(?:www\.)?(?:linkedin\.com|twitter\.com|x\.com|github\.com|instagram\.com)\/[^"'\s>]+)["']/gi)) {
    socials.add(m[1]);
  }
  signals.contacts.socials = [...socials].slice(0, 4);

  return signals;
}

/**
 * Aggregates crawl signals across all crawled pages into a unified Lead & ROI profile.
 * @param {Array<object>} pageSignals
 * @returns {object}
 */
export function aggregateSiteProfile(pageSignals = []) {
  const profile = {
    avgResponseTimeMs: 0,
    hasMissingViewportMeta: false,
    detectedTech: new Set(),
    leadContacts: { emails: new Set(), phones: new Set(), socials: new Set() },
    seoScore: 100,
    security: { isHttps: true, hasHsts: true, hasCsp: true, score: 100, flags: [] },
    assetHygiene: { uncompressedCount: 0, unlazyImagesTotal: 0 },
  };

  if (!pageSignals.length) return profile;

  let totalTime = 0;
  for (const s of pageSignals) {
    totalTime += s.responseTimeMs || 0;
    if (!s.hasViewportMeta) profile.hasMissingViewportMeta = true;
    (s.techStack || []).forEach((t) => profile.detectedTech.add(t));
    (s.contacts?.emails || []).forEach((e) => profile.leadContacts.emails.add(e));
    (s.contacts?.phones || []).forEach((p) => profile.leadContacts.phones.add(p));
    (s.contacts?.socials || []).forEach((sc) => profile.leadContacts.socials.add(sc));

    if (!s.hasTitle) profile.seoScore -= 10;
    if (!s.hasDescription) profile.seoScore -= 5;
    if (!s.hasOpenGraph) profile.seoScore -= 5;

    if (s.security) {
      if (!s.security.isHttps) profile.security.isHttps = false;
      if (!s.security.hasHsts) profile.security.hasHsts = false;
      if (!s.security.hasCsp) profile.security.hasCsp = false;
    }
    if (s.performance) {
      if (!s.performance.compressed) profile.assetHygiene.uncompressedCount++;
      profile.assetHygiene.unlazyImagesTotal += s.performance.unlazyImages || 0;
    }
  }

  if (!profile.security.isHttps) { profile.security.score -= 40; profile.security.flags.push('Insecure HTTP'); }
  if (!profile.security.hasHsts) { profile.security.score -= 20; profile.security.flags.push('Missing HSTS'); }
  if (!profile.security.hasCsp) { profile.security.score -= 15; profile.security.flags.push('Missing CSP'); }
  profile.security.score = Math.max(25, profile.security.score);

  profile.avgResponseTimeMs = Math.round(totalTime / pageSignals.length);
  profile.seoScore = Math.max(20, Math.min(100, profile.seoScore));

  return {
    avgResponseTimeMs: profile.avgResponseTimeMs,
    hasMissingViewportMeta: profile.hasMissingViewportMeta,
    techStack: [...profile.detectedTech],
    leadContacts: {
      emails: [...profile.leadContacts.emails],
      phones: [...profile.leadContacts.phones],
      socials: [...profile.leadContacts.socials],
    },
    seoScore: profile.seoScore,
    security: {
      isHttps: profile.security.isHttps,
      score: profile.security.score,
      flags: profile.security.flags,
    },
    assetHygiene: profile.assetHygiene,
  };
}
