/** Small HTML fragments used by the on-screen executive report. */

import { esc } from './esc.js';
import { buildSalesCta } from './rebuildCase.js';

export function reportListHtml(items = []) {
  return items.map((item) => `<li>${esc(item)}</li>`).join('');
}

export function reportFindingsHtml(clusters = []) {
  return clusters.map((c) => {
    const label = c.severityLabel || (c.severity === 'info' ? 'Needs review' : c.severity);
    const title = c.title || c.rule;
    const impact = c.impact || c.detail || '';
    return `<div class="cluster">
      <div class="split">
        <b class="${c.severity === 'error' ? 'bad' : 'warn'}">${esc(label)}: ${esc(title)}</b>
        <span class="meta">${esc(c.observed || '')}</span>
      </div>
      <div>${esc(impact)}</div>
      ${c.detail ? `<div class="meta">${esc(c.detail)}</div>` : ''}
      ${c.selector ? `<div class="meta">${esc(c.selector)}</div>` : ''}
    </div>`;
  }).join('');
}

export function reportMailtoHref(leadEmail, domain, coverageLine, runId, cta = null) {
  const subject = cta?.subject
    || encodeURIComponent(`Audit findings – ${domain}`);
  const body = cta?.mailBody
    || encodeURIComponent(`I reviewed the audit for ${domain}.\n\n${coverageLine}\n\nRun ID: ${runId}`);
  return `mailto:${esc(leadEmail)}?subject=${subject}&body=${body}`;
}

export function reportSalesSectionsHtml({
  grade, score, sales, domain, agency, techStack, leadEmail, coverageLine, runId,
}) {
  if (score == null || !grade) return '';
  const cta = buildSalesCta({
    grade, domain, agency, preferRebuild: Boolean(sales?.preferRebuild), techStack,
  });
  const bloat = sales?.frameworkBloat
    ? `<p class="sales-bloat"><b>Framework bloat:</b> ${esc(sales.frameworkBloat)}</p>`
    : '';
  const effort = sales
    ? `<div class="effort-grid">
        <div><span class="meta">Remediation estimate</span><div class="effort-num">${sales.remediateHours}h</div></div>
        <div><span class="meta">${esc(agency)} Vite rebuild</span><div class="effort-num">${sales.rebuildHours}h</div></div>
      </div>
      <p>${esc(sales.rationale || '')}</p>`
    : '';
  return `
    <section class="impact-section grade-card">
      <h2>Health grade ${esc(grade)} <span class="meta">(${score}/100)</span></h2>
      <p>Score uses component failures with per-category caps — repeating the same control across seven viewports does not multiply the penalty.</p>
      ${bloat}
      ${effort}
    </section>
    <section class="cta-card">
      <h2>${esc(cta.headline)}</h2>
      <p>${esc(cta.body)}</p>
      <a class="btn-cta" href="${reportMailtoHref(leadEmail, domain, coverageLine, runId, cta)}">${esc(cta.ctaLabel)}</a>
    </section>`;
}
