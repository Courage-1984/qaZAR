/** Pure performance / funnel / contacts slices for crawl page signals. */

import {
  classifyFunnelUrl, countBlockingHeadScripts, countUnlazyImages,
} from './techStack.js';
import { countWebFonts, hasLeadForm, insecureFormCount } from './pageHygiene.js';

export function performanceOf(html, getHeader) {
  return {
    compressed: Boolean(getHeader?.('content-encoding')),
    unlazyImages: countUnlazyImages(html),
    renderBlockingScripts: countBlockingHeadScripts(html),
    webFonts: countWebFonts(html),
  };
}

export function funnelOf(html, url) {
  return {
    ...classifyFunnelUrl(url),
    hasLeadForm: hasLeadForm(html),
    insecureForms: insecureFormCount(url, html),
  };
}

export function contactsOf(leads) {
  return {
    emails: leads?.emails || [],
    phones: leads?.phones || [],
    socials: leads?.socials || [],
  };
}
