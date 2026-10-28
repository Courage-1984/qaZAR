/** Small HTML fragments used by the on-screen executive report. */

import { esc } from './esc.js';

export function reportListHtml(items = []) {
  return items.map((item) => `<li>${esc(item)}</li>`).join('');
}

export function reportFindingsHtml(clusters = []) {
  return clusters.map((c) => {
    const label = c.severity === 'info' ? 'needs review' : c.severity;
    return `<div class="cluster">
      <div class="split">
        <b class="${c.severity === 'error' ? 'bad' : 'warn'}">${esc(label)}: ${esc(c.rule)}</b>
        <span class="meta">${esc(c.observed)} · ${c.totalOccurrences} time(s)</span>
      </div>
      <div>${esc(c.detail)}</div>
      ${c.selector ? `<div class="meta">${esc(c.selector)}</div>` : ''}
    </div>`;
  }).join('');
}

export function reportMailtoHref(leadEmail, domain, coverageLine, runId) {
  const subject = encodeURIComponent(`Audit findings – ${domain}`);
  const body = encodeURIComponent(`I reviewed the audit for ${domain}.\n\n${coverageLine}\n\nRun ID: ${runId}`);
  return `mailto:${esc(leadEmail)}?subject=${subject}&body=${body}`;
}
