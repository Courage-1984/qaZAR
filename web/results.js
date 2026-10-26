import { api, esc, getApiBase } from './api.js';
import { cellInfo, renderCell } from './cellView.js';

const app = document.getElementById('app');
const VPS = ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile'];
const id = new URLSearchParams(location.search).get('id');
const samePage = (path) => {
  const base = getApiBase();
  if (!base) return path;
  const u = new URL(path, location.href);
  u.searchParams.set('api', base);
  return `${u.pathname.split('/').pop()}${u.search}`;
};
let timer;
let selected = null; // {slug, vp}

const fmtDate = (s) => new Date(s).toLocaleString();
const fail = (e) => {
  app.innerHTML = `<h1>Results</h1><div class="card"><p class="msg bad">${esc(e.message)}</p>
    <p class="muted">Check the API base URL on the <a href="${samePage('./index.html')}">Submit</a> page, or auto-detect below.</p>
    <button class="btn sm" id="retry-discovery">Auto-Detect Server</button>
  </div>`;
  document.getElementById('retry-discovery')?.addEventListener('click', async () => {
    app.innerHTML = `<h1>Results</h1><div class="card"><p class="msg">Auto-detecting live qaZAR server…</p></div>`;
    const found = await api.autoDiscover();
    if (found) {
      if (id) startWatching();
      else renderList();
    } else {
      fail(new Error('Could not auto-detect server. Is qaZAR running?'));
    }
  });
};

/* ---------- list view ---------- */
async function renderList() {
  try {
    const runs = await api.listRuns();
    if (!Array.isArray(runs)) throw new Error('The API did not return a run list.');
    app.innerHTML = `<h1>Results</h1>
      <div class="card"><table class="tbl" id="runs-table"><thead><tr><th>Run</th><th>Domain</th><th>Status</th><th>Pages</th><th>Errors</th><th>Changed</th><th></th></tr></thead><tbody>
      ${runs.map((r) => `<tr>
        <td><a href="${samePage(`?id=${encodeURIComponent(r.id)}`)}">${esc(r.id)}</a><div class="muted sm">${esc(fmtDate(r.createdAt))}</div></td>
        <td>${esc(r.input.domain)}</td>
        <td><span class="badge ${esc(r.status)}">${esc(r.status)}</span></td>
        <td>${r.progress.pagesDone}/${r.progress.pagesTotal}</td>
        <td>${r.summary ? r.summary.violations.error : '–'}</td>
        <td>${r.summary ? r.summary.changed : '–'}</td>
        <td>
          <a class="btn sm" href="${api.reportUrl(r.id, true)}" download title="Download Executive Report">Report</a>
          <button class="btn sm danger" data-del="${esc(r.id)}" aria-label="Delete run ${esc(r.id)}">Delete</button>
        </td></tr>`).join('') || `<tr><td colspan="7" class="muted">No runs yet. <a href="${samePage('./index.html')}">Start one</a>.</td></tr>`}
      </tbody></table></div>`;
    app.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (confirm('Delete this run?')) {
          await api.deleteRun(b.dataset.del);
          renderList();
        }
      }),
    );
  } catch (e) {
    fail(e);
  }
}

/* ---------- detail view ---------- */
let filter = 'all';
let query = '';
let streamState = 'idle';

function renderDetail(run) {
  const s = run.summary;
  const filtered = (run.pages || []).filter((p) => {
    if (query && !p.url.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'all') return true;
    const vps = Object.values(p.viewports || {});
    if (filter === 'error') return vps.some((r) => r.violations?.some((v) => v.severity === 'error'));
    if (filter === 'warn') return vps.some((r) => r.violations?.some((v) => v.severity === 'warn'));
    if (filter === 'changed') return vps.some((r) => r.status === 'changed');
    return true;
  });

  const rows = filtered
    .map(
      (p) => `<tr><td class="url"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(new URL(p.url).pathname + new URL(p.url).search)}</a>${p.roi ? `<span class="badge" style="font-size:0.7rem; margin-left:0.4rem; background:rgba(99,102,241,0.15); color:#818cf8;">${esc(p.roi.label)} · ${p.roi.score}pts</span>` : ''}</td>
      ${VPS.map((vp) => {
        const rec = p.viewports?.[vp];
        const c = cellInfo(rec);
        const sel = selected && selected.slug === p.slug && selected.vp === vp ? ' sel' : '';
        return `<td><button class="cell ${c.cls}${sel}" data-slug="${esc(p.slug)}" data-vp="${vp}" aria-label="${esc(p.url)} ${vp}">${esc(c.label)}</button></td>`;
      }).join('')}</tr>`,
    )
    .join('');
  const active = !['done', 'failed', 'cancelled'].includes(run.status);
  const liveBadge = active && streamState === 'sse' ? ' · 🟢 Live SSE' : active && streamState === 'poll' ? ' · 🟡 Polling' : '';
  const statusLabel = run.status === 'done' ? '✓ Complete' : run.status;
  const savedAgency = localStorage.getItem('qazar.agency') || '';
  app.innerHTML = `
    <p><a href="${samePage('./results.html')}">← All runs</a></p>
    <h1>${esc(run.input.domain)}</h1>
    ${run.input.pages?.length ? `<p class="muted sm">Crawl limited to ${run.input.pages.length} submitted page${run.input.pages.length === 1 ? '' : 's'}.</p>` : ''}
    <div class="stats">
      <div class="stat"><span class="badge ${esc(run.status)}">${esc(statusLabel)}${liveBadge}</span><small>${esc(run.id)}</small></div>
      <div class="stat"><b>${run.progress.pagesDone}/${run.progress.pagesTotal}</b><small>pages</small></div>
      ${s ? `<div class="stat"><b>${s.violations.error}</b><small>errors</small></div><div class="stat"><b>${s.violations.warn}</b><small>warnings</small></div><div class="stat"><b>${s.changed}</b><small>visual changes</small></div><div class="stat"><b>${s.new}</b><small>new baselines</small></div>` : ''}
    </div>
    ${run.siteProfile ? `
      <div class="card" style="margin-bottom: 1rem; padding: 0.75rem 1rem;">
        <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.25rem;">Crawl &amp; Lead Intelligence</div>
        <div class="row" style="gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem;">
          <div>⏱️ <b>${run.siteProfile.avgResponseTimeMs}ms</b> latency</div>
          <div>🛠️ <b>${esc((run.siteProfile.techStack || []).join(', ') || 'Custom')}</b></div>
          <div>📱 <b>${run.siteProfile.hasMissingViewportMeta ? '⚠️ Missing Viewport' : '✓ Viewport Meta'}</b></div>
          <div>🎯 <b>${[run.siteProfile.funnel?.hasPricing ? 'Pricing' : null, run.siteProfile.funnel?.hasCheckout ? 'Checkout' : null, run.siteProfile.funnel?.hasContact ? 'Contact' : null].filter(Boolean).join(' · ') || 'Brochureware'}</b></div>
          ${run.siteProfile.assetHygiene?.blockingScriptsTotal ? `<div style="color:#f59e0b;">⚠️ <b>${run.siteProfile.assetHygiene.blockingScriptsTotal} Blocking Script(s)</b></div>` : ''}
          ${run.siteProfile.funnel?.brokenLinks?.length ? `<div style="color:#ef4444;">🚨 <b>${run.siteProfile.funnel.brokenLinks.length} Broken Link(s)</b></div>` : ''}
          ${run.siteProfile.leadContacts?.emails?.length ? `<div>✉️ <b>${esc(run.siteProfile.leadContacts.emails[0])}</b></div>` : ''}
        </div>
      </div>
    ` : ''}
    <div class="row" style="margin: 1rem 0; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
      <input type="text" id="agency-name" placeholder="Brand / Agency (optional)" value="${esc(savedAgency)}" style="padding:0.4rem 0.6rem; border-radius:6px; background:var(--card); border:1px solid var(--border); color:#fff; font-size:0.85rem; width:180px;" title="Whitelabel brand for executive report">
      <a class="btn primary" id="btn-download-report" href="${api.reportUrl(run.id, { download: '1', agency: savedAgency || undefined })}" download>📥 Download Executive Report</a>
      <a class="btn" id="btn-view-report" href="${api.reportUrl(run.id, { agency: savedAgency || undefined })}" target="_blank" rel="noopener">👁️ View Report</a>
      <a class="btn" href="${api.reportUrl(run.id, { format: 'json' })}" target="_blank" rel="noopener">{ } JSON Summary</a>
      ${run.status === 'done' ? '<button class="btn" id="promote-all">Set all captures as baseline</button>' : ''}
    </div>
    ${run.status === 'done' ? `
      <div class="card" style="border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.06); margin-bottom: 1.5rem;">
        <h3 style="color: #818cf8; margin-bottom: 0.25rem;">Turn Audit Findings Into High-Converting UX</h3>
        <p class="muted sm" style="margin-bottom: 0.75rem;">Download the executive report above for a client-ready assessment, or request a complete code remediation plan to resolve all mobile and accessibility defects.</p>
        <a class="btn sm primary" href="${api.reportUrl(run.id, { agency: savedAgency || undefined })}" target="_blank">View Client-Ready Executive Report →</a>
      </div>
    ` : ''}
    ${run.error ? `<p class="msg bad">${esc(run.error)}</p>` : ''}
    ${run.status === 'crawling' && run.crawlMessage ? `<p class="muted">${esc(run.crawlMessage)}</p>` : ''}
    ${active ? '<div class="bar"><i style="width:' + (run.progress.pagesTotal ? Math.round((run.progress.pagesDone / run.progress.pagesTotal) * 100) : 8) + '%"></i></div>' : ''}
    ${run.pages.length ? `
      <div class="row" style="margin:1rem 0 0.5rem 0; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <input type="search" id="page-search" placeholder="Search pages..." value="${esc(query)}" style="padding:0.35rem 0.6rem; border-radius:6px; background:var(--card); border:1px solid var(--border); color:#fff; font-size:0.85rem; width:180px;">
        <div style="display:flex; gap:0.3rem;">
          ${['all', 'error', 'warn', 'changed'].map((f) => `<button class="btn sm ${filter === f ? 'primary' : ''}" data-filter="${f}">${f.toUpperCase()}</button>`).join('')}
        </div>
        <small class="muted" style="margin-left:auto;">Showing ${filtered.length}/${run.pages.length} pages</small>
      </div>
      <div class="card scroll"><table class="tbl matrix" id="matrix"><thead><tr><th>Page</th>${VPS.map((v) => `<th>${v}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">No pages match filter.</td></tr>'}</tbody></table>
      <p class="muted sm">E = errors, W = warnings, dashed outline = visual change vs baseline. Click a cell for details.</p></div>` : ''}
    <div id="detail"></div>`;
  app.querySelectorAll('.cell').forEach((b) =>
    b.addEventListener('click', () => {
      selected = { slug: b.dataset.slug, vp: b.dataset.vp };
      renderDetail(run);
    }),
  );
  app.querySelectorAll('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      renderDetail(run);
    }),
  );
  document.getElementById('agency-name')?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    localStorage.setItem('qazar.agency', val);
    const dl = document.getElementById('btn-download-report');
    const vw = document.getElementById('btn-view-report');
    if (dl) dl.href = api.reportUrl(run.id, { download: '1', agency: val || undefined });
    if (vw) vw.href = api.reportUrl(run.id, { agency: val || undefined });
  });
  document.getElementById('page-search')?.addEventListener('input', (e) => {
    query = e.target.value;
    renderDetail(run);
    document.getElementById('page-search')?.focus();
  });
  document.getElementById('promote-all')?.addEventListener('click', async () => {
    const r = await api.promote(run.id);
    alert(`Promoted ${r.promoted} captures to baseline.`);
  });
  if (selected) renderCell(run, selected);
}

let eventSource = null;

async function fetchAndRender() {
  try {
    const run = await api.getRun(id);
    const keepScroll = scrollY;
    renderDetail(run);
    scrollTo(0, keepScroll);
    if (['done', 'failed', 'cancelled'].includes(run.status)) {
      streamState = 'done';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (timer) clearTimeout(timer);
    }
    return run;
  } catch (e) {
    fail(e);
  }
}

function fallbackPoll() {
  if (streamState !== 'sse') streamState = 'poll';
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const run = await fetchAndRender();
    if (run && !['done', 'failed', 'cancelled'].includes(run.status)) fallbackPoll();
  }, 2000);
}

async function startWatching() {
  const initial = await fetchAndRender();
  if (!initial || ['done', 'failed', 'cancelled'].includes(initial.status)) return;
  // Poll even when SSE is open. Cloudflare tunnels buffer the event stream, which
  // otherwise leaves the page on the first "crawling · 0/0" snapshot.
  fallbackPoll();
  if (typeof EventSource === 'undefined') return;
  try {
    eventSource = new EventSource(api.eventsUrl(id));
    streamState = 'sse';
    eventSource.onmessage = () => fetchAndRender();
    eventSource.onerror = () => {
      streamState = 'poll';
      eventSource?.close();
      eventSource = null;
    };
  } catch {
    /* poll already running */
  }
}

if (id) startWatching();
else renderList();

