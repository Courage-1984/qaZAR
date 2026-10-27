import { api, esc } from './api.js';

export function renderRunList(runs, samePage, fmtDate) {
  if (!runs.length) {
    return `<h1>Results</h1><div class="card"><p class="muted">No runs yet. <a class="hit" href="${samePage('./index.html')}">Start one</a>.</p></div>`;
  }
  const cards = runs.map((r) => `<article class="card run-card">
    <div>
      <a class="hit" href="${samePage(`?id=${encodeURIComponent(r.id)}`)}">${esc(r.id)}</a>
      <div class="muted sm">${esc(fmtDate(r.createdAt))}</div>
      <div class="run-meta">
        <div><span class="muted sm">Domain</span><b>${esc(r.input?.domain || '')}</b></div>
        <div><span class="muted sm">Status</span><span class="badge ${esc(r.status)}">${esc(r.status)}</span></div>
        <div><span class="muted sm">Pages</span><b>${r.progress?.pagesDone ?? 0}/${r.progress?.pagesTotal ?? 0}</b></div>
        <div><span class="muted sm">Errors</span><b>${r.summary ? r.summary.violations.error : '–'}</b></div>
        <div><span class="muted sm">Changed</span><b>${r.summary ? r.summary.changed : '–'}</b></div>
      </div>
    </div>
    <div class="actions">
      <a class="btn" href="${api.reportUrl(r.id, true)}" download>Report</a>
      <button class="btn danger" data-del="${esc(r.id)}" aria-label="Delete run ${esc(r.id)}">Delete</button>
    </div>
  </article>`).join('');
  return `<h1>Results</h1><div class="run-list">${cards}</div>`;
}
