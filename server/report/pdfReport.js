import { calculateHealthScore } from './scoreCalculator.js';
import { getPdfStyles } from './pdfStyles.js';
import { renderSeoSection } from './seoSection.js';
import { renderLeadSection } from './leadSection.js';
import { esc } from './esc.js';
import {
  flattenRoadmap, reportDate, reportDomain, reportTimingLine, viewportViolationTallies,
} from './reportMeta.js';

function findings(clusters) {
  return clusters.map((c) => {
    const label = c.severity === 'info' ? 'needs review' : c.severity;
    return `<div class="cluster">
      <div class="split"><b class="${c.severity === 'error' ? 'bad' : 'warn'}">${esc(label)}: ${esc(c.rule)}</b>
        <span class="meta">${esc(c.observed)} · ${c.totalOccurrences} time(s)</span></div>
      <div>${esc(c.detail)}</div>
      ${c.selector ? `<div class="meta">${esc(c.selector)}</div>` : ''}
    </div>`;
  }).join('');
}

function viewportTable(pages) {
  const rows = viewportViolationTallies(pages).map(({ name, errors, warns }) => (
    `<tr><td>${name}</td><td>${errors}</td><td>${warns}</td></tr>`
  )).join('');
  return `<section><h2>By viewport</h2>
    <table class="seo-table"><thead><tr><th>Viewport</th><th>Errors</th><th>Warnings</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

/** A4 document. Same findings and coverage line as the on-screen report. */
export function generatePdfReport(run, leadEmail = 'consulting@qazar.dev', options = {}) {
  const { metrics, clusters, facts, roadmap } = calculateHealthScore(run);
  const domain = reportDomain(run);
  const agency = options.agency || 'qaZAR';
  const dateStr = reportDate(run.createdAt);
  const shown = clusters || [];
  const timing = reportTimingLine(run);
  const next = flattenRoadmap(roadmap);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(agency)} audit of ${esc(domain)}</title>
  <style>${getPdfStyles()}</style>
</head>
<body>
  <header class="cover">
    <div class="kicker">${esc(agency)}</div>
    <h1>Viewport audit</h1>
    <div class="domain">${esc(domain)}</div>
    <p>${esc(metrics.coverageLine)} ${metrics.totalPages} page(s) on ${esc(dateStr)}. ${esc(timing)}</p>
    <p>${metrics.distinctErrors} confirmed error pattern(s), ${metrics.distinctWarnings} confirmed warning pattern(s). Needs-review notes are not counted as failures.</p>
  </header>
  <section>
    <h2>What was measured</h2>
    <ul>${facts.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
    ${metrics.categories.mobileTouch > 0 ? '<p>Small target may be difficult to activate.</p>' : ''}
  </section>
  ${viewportTable(run.pages)}
  ${shown.length ? `<section><h2>Findings (${shown.length})</h2>${findings(shown)}</section>` : ''}
  ${next.length ? `<section><h2>What to check next</h2><ul>${next.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>` : ''}
  ${renderSeoSection(run.siteProfile)}
  ${renderLeadSection(run.siteProfile)}
  <p class="close">Prepared for ${esc(domain)}. Reply to ${esc(leadEmail)}.</p>
</body>
</html>`;
}
