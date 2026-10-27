/**
 * Merge one rendered page into the site profile. Used on the desktop capture only.
 */
import { extractCrawlSignals } from './siteProfiler.js';
import { summarizeSeo } from './seo.js';
import { unionLeads } from './leads.js';

const seoSources = new WeakMap();

export function absorbRendered(profile, html, url) {
  if (!profile || !html) return profile;
  const signal = extractCrawlSignals(html, url, 0, null);
  profile.funnel = profile.funnel || {};
  if (signal.funnel?.isPricing) profile.funnel.hasPricing = true;
  if (signal.funnel?.isCheckout) profile.funnel.hasCheckout = true;
  if (signal.funnel?.isAuth) profile.funnel.hasAuth = true;
  if (signal.funnel?.isContact || signal.funnel?.hasLeadForm) profile.funnel.hasContact = true;
  if (signal.funnel?.hasLeadForm) profile.funnel.hasLeadForm = true;
  profile.techStack = profile.techStack || [];
  for (const name of signal.techStack || []) {
    if (!profile.techStack.includes(name)) profile.techStack.push(name);
  }
  unionLeads(profile, signal.leads, url);
  if (profile.codeHygiene?.measured !== true && signal.codeHygiene) {
    profile.codeHygiene = {
      legacyTagsTotal: signal.codeHygiene.legacyTags || 0,
      missingAltImagesTotal: signal.codeHygiene.missingAltImages || 0,
      hasFavicon: signal.codeHygiene.hasFavicon === true,
      measured: true,
    };
  }
  if (profile.assetHygiene?.measured !== true && signal.performance) {
    profile.assetHygiene = {
      uncompressedCount: null,
      unlazyImagesTotal: signal.performance.unlazyImages || 0,
      blockingScriptsTotal: signal.performance.renderBlockingScripts || 0,
      webFontsTotal: signal.performance.webFonts || 0,
      measured: true,
    };
  }
  if (profile.socialSharing?.measured !== true) {
    profile.socialSharing = {
      hasOpenGraph: signal.hasOpenGraph === true,
      hasCanonical: signal.hasCanonical === true,
      openGraphPages: signal.hasOpenGraph ? 1 : 0,
      canonicalPages: signal.hasCanonical ? 1 : 0,
      pageCount: 1,
      measured: true,
    };
  }
  if (profile.hasMissingViewportMeta == null) profile.hasMissingViewportMeta = signal.hasViewportMeta === false;
  if (profile.security?.score == null) profile.security = { isHttps: null, score: null, flags: [], measured: false };
  if (profile.responseMeasured !== true) {
    profile.avgResponseTimeMs = null;
    profile.responseMeasured = false;
  }
  const alreadyScored = profile.seo?.pages?.length && !seoSources.has(profile);
  if (!alreadyScored && signal.seo) {
    const seos = seoSources.get(profile) || [];
    seos.push(signal.seo);
    seoSources.set(profile, seos);
    profile.seo = summarizeSeo(seos);
  }
  return profile;
}
