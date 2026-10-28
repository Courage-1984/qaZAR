/** Plain-language “what was measured” lines for executive reports. */

const EMPTY = [
  'Response: Not measured',
  'Transport and response headers: Not tested',
  'Assets: Not tested',
  'Favicon: Not tested',
  'Social tags: Not tested',
  'robots.txt: Not tested',
  'Search tags were not measured.',
];

export function profileFacts(profile) {
  if (!profile) return [...EMPTY];
  const assets = profile.assetHygiene;
  const code = profile.codeHygiene;
  const social = profile.socialSharing;
  const robots = profile.crawlMeta?.hasRobotsTxt;
  const lines = [
    profile.responseMeasured === true && profile.avgResponseTimeMs != null
      ? `Response ${profile.avgResponseTimeMs} ms`
      : 'Response: Not measured',
    typeof profile.security?.score === 'number'
      ? `Transport and response headers ${profile.security.score}/100`
      : 'Transport and response headers: Not tested',
    assets?.measured === true
      ? `Blocking scripts ${assets.blockingScriptsTotal ?? 0}, images without lazy ${assets.unlazyImagesTotal ?? 0}`
      : 'Assets: Not tested',
    code?.measured !== true ? 'Favicon: Not tested' : (code.hasFavicon ? 'A favicon link was present' : 'No favicon link was present'),
    social?.measured !== true ? 'Social tags: Not tested' : (social.hasOpenGraph ? 'Open Graph tags were present' : 'No Open Graph tags were present'),
    robots == null ? 'robots.txt: Not tested' : (robots ? 'robots.txt was fetched' : 'robots.txt was not found'),
  ];
  if (profile.techStack?.length) lines.push(`Stack seen: ${profile.techStack.join(', ')}`);
  if (profile.funnel?.hasPricing) lines.push('A pricing page was seen.');
  if (profile.funnel?.hasCheckout) lines.push('A checkout page was seen.');
  if (profile.funnel?.hasLeadForm) lines.push('A form was seen.');
  if (!profile.seo) lines.push('Search tags were not measured.');
  return lines;
}
