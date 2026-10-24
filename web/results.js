import { api, esc } from './api.js';

const app = document.getElementById('app');
const VPS = ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile'];
const id = new URLSearchParams(location.search).get('id');
let timer;
let selected = null; // {slug, vp}

const fmtDate = (s) => new Date(s).toLocaleString();
const fail = (e) => {
  app.innerHTML = `<h1>Results</h1><div class="card"><p class="msg bad">${esc(e.message)}</p><p class="muted">Check the API base URL on the <a href="./index.html">Submit</a> page.</p></div>`;
};

/* ---------- list view ---------- */
async function renderList() {
  try {
    const runs = await api.listRuns();
    app.innerHTML = `<h1>Results</h1>
      <div class="card"><table class="tbl" id="runs-table"><thead><tr><th>Run</th><th>Domain</th><th>Status</th><th>Pages</th><th>Errors</th><th>Changed</th><th></th></tr></thead><tbody>
      ${runs.map((r) => `<tr>
        <td><a href="?id=${encodeURIComponent(r.id)}">${esc(r.id)}</a><div class="muted sm">${esc(fmtDate(r.createdAt))}</div></td>
        <td>${esc(r.input.domain)}</td>
        <td><span class="badge ${esc(r.status)}">${esc(r.status)}</span></td>
        <td>${r.progress.pagesDone}/${r.progress.pagesTotal}</td>
        <td>${r.summary ? r.summary.violations.error : '–'}</td>
        <td>${r.summary ? r.summary.changed : '–'}</td>
        <td>
          <a class="btn sm" href="${api.reportUrl(r.id, true)}" download title="Download Executive Report">Report</a>
          <button class="btn sm danger" data-del="${esc(r.id)}" aria-label="Delete run ${esc(r.id)}">Delete</button>
        </td></tr>`).join('') || '<tr><td colspan="7" class="muted">No runs yet. <a href="./index.html">Start one</a>.</td></tr>'}
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
function cellInfo(rec) {
  if (!rec) return { cls: 'pending', label: '…' };
  if (rec.status === 'error') return { cls: 'error', label: 'ERR' };
  const errs = rec.violations.filter((v) => v.severity === 'error').length;
  const warns = rec.violations.filter((v) => v.severity === 'warn').length;
  let cls = errs ? 'error' : warns ? 'warn' : 'ok';
  if (rec.status === 'changed') cls += ' changed';
  const label = `${errs ? errs + 'E ' : ''}${warns ? warns + 'W' : ''}`.trim() || '✓';
  return { cls, label };
}

let filter = 'all';
let query = '';

function renderDetail(run) {
  const s = run.summary;
  const filtered = run.pages.filter((p) => {
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
        const rec = p.viewports[vp];
        const c = cellInfo(rec);
        const sel = selected && selected.slug === p.slug && selected.vp === vp ? ' sel' : '';
        return `<td><button class="cell ${c.cls}${sel}" data-slug="${esc(p.slug)}" data-vp="${vp}" aria-label="${esc(p.url)} ${vp}">${esc(c.label)}</button></td>`;
      }).join('')}</tr>`,
    )
    .join('');
  const active = !['done', 'failed', 'cancelled'].includes(run.status);
  const statusLabel = run.crawlMessage && active ? `${run.status}: ${run.crawlMessage}` : run.status;
  app.innerHTML = `
    <p><a href="./results.html">← All runs</a></p>
    <h1>${esc(run.input.domain)}</h1>
    <div class="stats">
      <div class="stat"><span class="badge ${esc(run.status)}">${esc(statusLabel)}</span><small>${esc(run.id)}</small></div>
      <div class="stat"><b>${run.progress.pagesDone}/${run.progress.pagesTotal}</b><small>pages</small></div>
      ${s ? `<div class="stat"><b>${s.violations.error}</b><small>errors</small></div><div class="stat"><b>${s.violations.warn}</b><small>warnings</small></div><div class="stat"><b>${s.changed}</b><small>visual changes</small></div><div class="stat"><b>${s.new}</b><small>new baselines</small></div>` : ''}
    </div>
    ${run.siteProfile ? `
      <div class="card" style="margin-bottom: 1rem; padding: 0.75rem 1rem;">
        <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.25rem;">Crawl &amp; Lead Intelligence</div>
        <div class="row" style="gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem;">
          <div>⏱️ <b>${run.siteProfile.avgResponseTimeMs}ms</b> latency</div>
          <div>🛠️ <b>${esc(run.siteProfile.techStack.join(', ') || 'Custom')}</b></div>
          <div>📱 <b>${run.siteProfile.hasMissingViewportMeta ? '⚠️ Missing Viewport' : '✓ Viewport Meta'}</b></div>
          <div>🎯 <b>${[run.siteProfile.funnel?.hasPricing ? 'Pricing' : null, run.siteProfile.funnel?.hasCheckout ? 'Checkout' : null, run.siteProfile.funnel?.hasContact ? 'Contact' : null].filter(Boolean).join(' · ') || 'Brochureware'}</b></div>
          ${run.siteProfile.assetHygiene?.blockingScriptsTotal ? `<div style="color:#f59e0b;">⚠️ <b>${run.siteProfile.assetHygiene.blockingScriptsTotal} Blocking Script(s)</b></div>` : ''}
          ${run.siteProfile.funnel?.brokenLinks?.length ? `<div style="color:#ef4444;">🚨 <b>${run.siteProfile.funnel.brokenLinks.length} Broken Link(s)</b></div>` : ''}
          ${run.siteProfile.leadContacts?.emails?.length ? `<div>✉️ <b>${esc(run.siteProfile.leadContacts.emails[0])}</b></div>` : ''}
        </div>
      </div>
    ` : ''}
    <div class="row" style="margin: 1rem 0; gap: 0.5rem; flex-wrap: wrap;">
      <a class="btn primary" href="${api.reportUrl(run.id, true)}" download>📥 Download Executive Report</a>
      <a class="btn" href="${api.reportUrl(run.id, false)}" target="_blank" rel="noopener">👁️ View Report</a>
      <a class="btn" href="${api.reportUrl(run.id, false)}&format=json" target="_blank" rel="noopener">{ } JSON Summary</a>
      ${run.status === 'done' ? '<button class="btn" id="promote-all">Set all captures as baseline</button>' : ''}
    </div>
    ${run.status === 'done' ? `
      <div class="card" style="border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.06); margin-bottom: 1.5rem;">
        <h3 style="color: #818cf8; margin-bottom: 0.25rem;">Turn Audit Findings Into High-Converting UX</h3>
        <p class="muted sm" style="margin-bottom: 0.75rem;">Download the executive report above for a client-ready assessment, or request a complete code remediation plan to resolve all mobile and accessibility defects.</p>
        <a class="btn sm primary" href="${api.reportUrl(run.id, false)}" target="_blank">View Client-Ready Executive Report →</a>
      </div>
    ` : ''}
    ${run.error ? `<p class="msg bad">${esc(run.error)}</p>` : ''}
    ${active ? '<div class="bar"><i style="width:' + (run.progress.pagesTotal ? (run.progress.pagesDone / run.progress.pagesTotal) * 100 : 5) + '%"></i></div>' : ''}
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
  document.getElementById('page-search')?.addEventListener('input', (e) => {
    query = e.target.value;
    renderDetail(run);
    document.getElementById('page-search')?.focus();
  });
  document.getElementById('promote-all')?.addEventListener('click', async () => {
    const r = await api.promote(run.id);
    alert(`Promoted ${r.promoted} captures to baseline.`);
  });
  if (selected) renderCell(run);
}

function renderCell(run) {
  const page = run.pages.find((p) => p.slug === selected.slug);
  const rec = page?.viewports[selected.vp];
  const el = document.getElementById('detail');
  if (!rec) return;
  const img = (rel, label) => rel ? `<figure><figcaption>${label}</figcaption><a href="${api.artifact(run.id, rel)}" target="_blank" rel="noopener"><img loading="lazy" alt="${label}" src="${api.artifact(run.id, rel)}"></a></figure>` : '';
  const v = rec.violations
    .map((x) => `<tr><td><span class="badge ${x.severity}">${esc(x.severity)}</span></td><td><code>${esc(x.rule)}</code></td><td>${esc(x.detail)}<div class="muted sm mono">${esc(x.selector || '')}</div></td></tr>`)
    .join('');
  el.innerHTML = `<div class="card" id="cell-detail"><h2>${esc(new URL(page.url).pathname)} · ${esc(selected.vp)}</h2>
    <p>Status: <span class="badge ${esc(rec.status)}">${esc(rec.status)}</span>${rec.diffPercent != null ? ` · diff ${rec.diffPercent}%` : ''}${rec.sizeChanged ? ' · size changed' : ''}</p>
    ${rec.error ? `<p class="msg bad">${esc(rec.error)}</p>` : ''}
    ${v ? `<table class="tbl"><thead><tr><th>Severity</th><th>Rule</th><th>Detail</th></tr></thead><tbody>${v}</tbody></table>` : '<p class="msg ok">No violations found.</p>'}
    <div class="shots">${img(rec.base, 'Baseline')}${img(rec.shot, 'Current')}${img(rec.diff, 'Diff')}</div>
    ${rec.shot ? '<button class="btn" id="promote-one">Set this capture as baseline</button>' : ''}</div>`;
  document.getElementById('promote-one')?.addEventListener('click', async () => {
    await api.promote(run.id, { slug: selected.slug, viewport: selected.vp });
    alert('Baseline updated.');
  });
}

let eventSource = null;

async function fetchAndRender() {
  try {
    const run = await api.getRun(id);
    const keepScroll = scrollY;
    renderDetail(run);
    scrollTo(0, keepScroll);
    if (['done', 'failed', 'cancelled'].includes(run.status)) {
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
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const run = await fetchAndRender();
    if (run && !['done', 'failed', 'cancelled'].includes(run.status)) {
      fallbackPoll();
    }
  }, 2000);
}

async function startWatching() {
  const initial = await fetchAndRender();
  if (!initial || ['done', 'failed', 'cancelled'].includes(initial.status)) return;

  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource(api.eventsUrl(id));
      eventSource.onmessage = () => fetchAndRender();
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        fallbackPoll();
      };
      return;
    } catch {
      /* fallback */
    }
  }
  fallbackPoll();
}

if (id) startWatching();
else renderList();

