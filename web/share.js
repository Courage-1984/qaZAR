import { api, bindNavApi, esc, getApiBase } from './api.js';

const app = document.getElementById('app');
const token = new URLSearchParams(location.search).get('token') || '';
let timer;

function samePage(path) {
  const base = getApiBase();
  if (!base) return path;
  const u = new URL(path, location.href);
  u.searchParams.set('api', base);
  return `${u.pathname.split('/').pop()}${u.search}`;
}

function render(data) {
  const active = !['done', 'failed', 'cancelled'].includes(data.status);
  const pdf = data.hasPdf
    ? `<a class="btn primary" href="${esc(api.sharePdfUrl(token))}" target="_blank" rel="noopener">Download PDF</a>`
    : '';
  const progress = data.progress
    ? `<div class="stat"><b>${data.progress.pagesDone || 0}/${data.progress.pagesTotal || 0}</b><small>pages</small></div>`
    : '';
  app.innerHTML = `
    <p><a class="hit" href="${samePage('./index.html')}">← Submit another</a></p>
    <h1>${esc(data.domain || 'Audit')}</h1>
    <div class="stats">
      <div class="stat"><span class="badge ${esc(data.status)}">${esc(data.status)}</span></div>
      ${progress}
      ${data.score != null ? `<div class="stat"><b>${esc(data.score)}</b><small>score</small></div>` : ''}
    </div>
    ${data.coverage ? `<p class="muted">${esc(data.coverage)}</p>` : ''}
    ${data.error ? `<p class="msg bad">${esc(data.error)}</p>` : ''}
    ${active ? '<div class="bar"><i style="width:18%"></i></div><p class="muted sm">Polling every 2s…</p>' : ''}
    <div class="row toolbar" style="margin-top:1rem">${pdf}</div>`;
}

async function tick() {
  try {
    if (!token) throw new Error('Missing share token in the URL (?token=).');
    const data = await api.share(token);
    render(data);
    if (['done', 'failed', 'cancelled'].includes(data.status)) {
      if (timer) clearTimeout(timer);
      return;
    }
    timer = setTimeout(tick, 2000);
  } catch (e) {
    app.innerHTML = `<h1>Shared audit</h1><div class="card"><p class="msg bad">${esc(e.message)}</p></div>`;
  }
}

bindNavApi();
tick();
