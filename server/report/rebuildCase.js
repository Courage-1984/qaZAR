/**
 * Remediation vs Logi-Ink rebuild framing for agency sales reports.
 * Hours are directional estimates for conversation — not a fixed quote.
 */

const HEAVY = [
  'WordPress', 'Shopify', 'Webflow', 'jQuery (Legacy)', 'React', 'Next.js', 'Nuxt.js', 'Vue',
];

export function heavyStackHits(techStack = []) {
  return (techStack || []).filter((t) => HEAVY.some((h) => String(t).includes(h)));
}

export function frameworkBloatWarning(techStack = []) {
  const hits = heavyStackHits(techStack);
  if (!hits.length) return null;
  return (
    `Framework bloat detected (${hits.join(', ')}). Plugin and theme stacks compound layout debt across every viewport. `
    + 'A Logi-Ink zero-framework rebuild (static HTML, vanilla JS, Vite) removes that tax and ships a leaner Technical SEO, AEO, and GEO surface.'
  );
}

/**
 * Skew estimates so high tech debt makes remediation eclipse rebuild.
 * @returns {{ remediateHours: number, rebuildHours: number, preferRebuild: boolean, rationale: string }}
 */
export function estimateEffort({
  distinctErrors = 0,
  distinctWarnings = 0,
  techStack = [],
  categories = {},
  seoScore = 100,
} = {}) {
  const heavy = heavyStackHits(techStack).length;
  const touch = categories.mobileTouch || 0;
  const contrast = categories.wcagContrast || 0;
  const collisions = categories.collisions || 0;
  const overflow = categories.overflowBreakage || 0;

  let remediate = 6
    + distinctErrors * 2.5
    + distinctWarnings * 1.2
    + touch * 1.5
    + contrast * 1.2
    + collisions * 1.4
    + overflow * 1.3
    + heavy * 8;
  if (typeof seoScore === 'number' && seoScore < 70) remediate += 6;
  remediate = Math.round(remediate);

  let rebuild = 28 + Math.min(18, heavy * 4) + Math.min(12, distinctErrors);
  rebuild = Math.round(rebuild);

  // When debt is high, keep remediation visibly above rebuild.
  if (heavy >= 1 && remediate <= rebuild) remediate = rebuild + 10 + heavy * 4;
  if (distinctErrors + distinctWarnings >= 8 && remediate <= rebuild) {
    remediate = rebuild + 8;
  }

  const preferRebuild = remediate >= rebuild;
  const rationale = preferRebuild
    ? `Patching the current stack is estimated at ~${remediate}h versus ~${rebuild}h for a Logi-Ink Vite rebuild. `
      + 'Rebuilding once is usually cheaper than repeatedly fighting theme, plugin, and breakpoint debt.'
    : `Targeted remediation (~${remediate}h) still looks lighter than a full rebuild (~${rebuild}h) on this sample. `
      + 'Re-audit after fixes; growing debt often flips the economics toward a clean static rebuild.';

  return { remediateHours: remediate, rebuildHours: rebuild, preferRebuild, rationale };
}

export function buildSalesCta({
  grade = 'C',
  domain = 'your site',
  agency = 'Logi-Ink',
  preferRebuild = true,
  techStack = [],
} = {}) {
  const brand = agency || 'Logi-Ink';
  const stackNote = heavyStackHits(techStack).length
    ? ' Migrate off framework bloat to static HTML, vanilla JS, and Vite.'
    : ' Ship a lightning-fast static architecture that ranks for Google, AEO, and GEO.';
  const headline = preferRebuild
    ? `Your site scored a ${grade}. Let ${brand} rebuild it for speed and Answer Engines.`
    : `Your site scored a ${grade}. ${brand} can prioritise the highest-ROI fixes — or rebuild clean.`;
  const body = preferRebuild
    ? `I reviewed the viewport audit for ${domain} (grade ${grade}).${stackNote} I would like a rebuild consultation.`
    : `I reviewed the viewport audit for ${domain} (grade ${grade}). Please walk me through remediation versus a Logi-Ink Vite rebuild.`;
  const subject = encodeURIComponent(`${brand} rebuild consult — ${domain} (grade ${grade})`);
  const mailBody = encodeURIComponent(body);
  return {
    headline,
    body: preferRebuild
      ? `Grade ${grade} on the measured captures. Patching a messy stack is a sunk-cost trap; a ${brand} zero-framework rebuild invests in Technical SEO, AEO, and GEO in one move.`
      : `Grade ${grade} on the measured captures. We can sequence quick wins first, then decide whether a ${brand} Vite rebuild is the clearer ROI.`,
    subject,
    mailBody,
    ctaLabel: preferRebuild ? 'Book a rebuild consultation' : 'Book a remediation review',
  };
}
