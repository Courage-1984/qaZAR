import { calculateHealthScore } from './scoreCalculator.js';
import { getPdfStyles } from './pdfStyles.js';
import { renderSeoSection } from './seoSection.js';
import { renderLeadSection } from './leadSection.js';
import { esc } from './esc.js';
import {
  flattenRoadmap, reportDate, reportDomain, reportTimingLine, viewportViolationTallies,
} from './reportMeta.js';
import { reportFindingsHtml, reportMailtoHref } from './reportHtml.js';
import { buildSalesCta } from './rebuildCase.js';

function viewportTable(pages) {
  const rows = viewportViolationTallies(pages).map(({ name, errors, warns }) => (
    `<tr><td>${name}</td><td>${errors}</td><td>${warns}</td></tr>`
  )).join('');
  return `<section><h2>By viewport (raw capture hits)</h2>
    <p class="meta">Raw per-viewport tallies for engineers. Scoring uses deduplicated component failures instead.</p>
    <table class="seo-table"><thead><tr><th>Viewport</th><th>Errors</th><th>Warnings</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

/** A4 document aligned with the on-screen sales narrative. */
export function generatePdfReport(run, leadEmail = 'consulting@qazar.dev', options = {}) {
  const health = calculateHealthScore(run);
  const {
    metrics, clusters, facts, roadmap, sales, score, grade,
  } = health;
  const domain = reportDomain(run);
  const agency = options.agency || 'Logi-Ink';
  const dateStr = reportDate(run.createdAt);
  const shown = (clusters || []).filter((c) => c.severity !== 'info').slice(0, 40);
  const timing = reportTimingLine(run);
  const next = flattenRoadmap(roadmap);
  const cta = buildSalesCta({
    grade: grade || 'C',
    domain,
    agency,
    preferRebuild: Boolean(sales?.preferRebuild),
    techStack: run.siteProfile?.techStack || [],
  });
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
    <h1>Viewport audit — grade ${esc(String(grade || '—'))}</h1>
    <div class="domain">${esc(domain)}</div>
    <p>${esc(metrics.coverageLine)} ${metrics.totalPages} page(s) on ${esc(dateStr)}. ${esc(timing)}</p>
    <p>${metrics.distinctErrors} critical component(s), ${metrics.distinctWarnings} warning component(s). Score ${score ?? '—'}/100 after category caps.</p>
  </header>
  <section>
    <h2>What was measured</h2>
    <ul>${facts.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
  </section>
  ${sales?.frameworkBloat ? `<section><h2>Framework bloat</h2><p>${esc(sales.frameworkBloat)}</p></section>` : ''}
  ${sales ? `<section><h2>Remediation versus rebuild</h2>
    <p>Remediation ~${sales.remediateHours}h · ${esc(agency)} Vite rebuild ~${sales.rebuildHours}h.</p>
    <p>${esc(sales.rationale || '')}</p></section>` : ''}
  ${viewportTable(run.pages)}
  ${shown.length ? `<section><h2>Business impact findings (${shown.length})</h2>${reportFindingsHtml(shown)}</section>` : ''}
  ${next.length ? `<section><h2>What to prioritise next</h2><ul>${next.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>` : ''}
  ${renderSeoSection(run.siteProfile)}
  ${renderLeadSection(run.siteProfile)}
  <section>
    <h2>${esc(cta.headline)}</h2>
    <p>${esc(cta.body)}</p>
    <p class="close"><a href="${reportMailtoHref(leadEmail, domain, metrics.coverageLine, run.id, cta)}">${esc(cta.ctaLabel)}</a>
    · Reply to ${esc(leadEmail)}.</p>
  </section>
</body>
</html>`;
}
