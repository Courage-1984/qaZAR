/**
 * Placeholder site profile when discovery skipped HTML profiling
 * (explicit page list or sitemap-only queue).
 */
export function emptyCrawlProfile(crawlMeta = {}) {
  return {
    avgResponseTimeMs: null,
    responseMeasured: false,
    hasMissingViewportMeta: null,
    techStack: [],
    leadContacts: { emails: [], phones: [], socials: [], contacts: [] },
    companyName: '',
    bookingLinks: [],
    leadHeat: 0,
    seoScore: null,
    security: { isHttps: null, score: null, flags: [], measured: false },
    assetHygiene: {
      uncompressedCount: null,
      unlazyImagesTotal: null,
      blockingScriptsTotal: null,
      webFontsTotal: null,
      measured: false,
    },
    codeHygiene: {
      legacyTagsTotal: null,
      missingAltImagesTotal: null,
      hasFavicon: null,
      measured: false,
    },
    socialSharing: {
      hasOpenGraph: null,
      hasCanonical: null,
      openGraphPages: null,
      canonicalPages: null,
      pageCount: null,
      measured: false,
    },
    funnel: {
      hasPricing: false,
      hasCheckout: false,
      hasAuth: false,
      hasContact: false,
      hasLeadForm: false,
      insecureFormsCount: 0,
      brokenLinks: [],
    },
    seo: null,
    crawlMeta,
  };
}
