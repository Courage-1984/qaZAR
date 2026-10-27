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
  const alreadyScored = profile.seo?.pages?.length && !seoSources.has(profile);
  if (!alreadyScored && signal.seo) {
    const seos = seoSources.get(profile) || [];
    seos.push(signal.seo);
    seoSources.set(profile, seos);
    profile.seo = summarizeSeo(seos);
  }
  return profile;
}
