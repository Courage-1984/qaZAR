import { api, bindNavApi, esc, getApiBase } from './api.js';
import { cellInfo, renderCell } from './cellView.js';
import { renderRunList } from './listView.js';

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
function leadSummary(profile) {
  if (!profile?.leadContacts) return '';
  const heat = Number.isFinite(profile.leadHeat) ? `<div>🔥 <b>${profile.leadHeat}</b> lead heat</div>` : '';
  const people = (profile.leadContacts.contacts || []).filter((c) => c.kind === 'email' || c.kind === 'phone').slice(0, 2);
  const shown = people.length ? people : (profile.leadContacts.emails || []).slice(0, 2).map((value) => ({ value, role: '' }));
  const who = shown.map((c) => esc(c.role ? `${c.role}: ${c.value}` : c.value)).join(' · ');
  const book = profile.bookingLinks?.[0] ? `<div>📅 <b>${esc(profile.bookingLinks[0])}</b></div>` : '';
  return `${heat}${who ? `<div>✉️ <b>${who}</b></div>` : ''}${book}`;
}
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
    app.innerHTML = renderRunList(runs, samePage, fmtDate);
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
      (p) => `<tr><td class="url"><a class="hit" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(new URL(p.url).pathname + new URL(p.url).search)}</a>${p.roi ? `<span class="badge roi">${esc(p.roi.label)} · ${p.roi.score}pts</span>` : ''}</td>
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
  const seo = run.siteProfile?.seo;
  const seoIssue = seo?.issues?.find((i) => i.severity === 'error' || i.severity === 'warn');
  app.innerHTML = `
    <p><a class="hit" href="${samePage('./results.html')}">← All runs</a></p>
    <h1>${esc(run.input.domain)}</h1>
    ${run.input.pages?.length ? `<p class="muted sm">Crawl limited to ${run.input.pages.length} submitted page${run.input.pages.length === 1 ? '' : 's'}.</p>` : ''}
    <div class="stats">
      <div class="stat"><span class="badge ${esc(run.status)}">${esc(statusLabel)}${liveBadge}</span><small>${esc(run.id)}</small></div>
      <div class="stat"><b>${run.progress.pagesDone}/${run.progress.pagesTotal}</b><small>pages</small></div>
      ${s ? `<div class="stat"><b>${s.violations.error}</b><small>errors</small></div><div class="stat"><b>${s.violations.warn}</b><small>warnings</small></div><div class="stat"><b>${s.changed}</b><small>visual changes</small></div><div class="stat"><b>${s.new}</b><small>new baselines</small></div>` : ''}
    </div>
    ${run.siteProfile ? `
      <div class="card">
        <div class="kicker">Crawl &amp; lead intelligence</div>
        <div class="chips">
          <div>⏱️ <b>${run.siteProfile.avgResponseTimeMs}ms</b> latency</div>
          <div>🛠️ <b>${esc((run.siteProfile.techStack || []).join(', ') || 'Custom')}</b></div>
          <div>📱 <b>${run.siteProfile.hasMissingViewportMeta ? '⚠️ Missing Viewport' : '✓ Viewport Meta'}</b></div>
          <div>🎯 <b>${[run.siteProfile.funnel?.hasPricing ? 'Pricing' : null, run.siteProfile.funnel?.hasCheckout ? 'Checkout' : null, run.siteProfile.funnel?.hasContact ? 'Contact' : null].filter(Boolean).join(' · ') || 'Brochureware'}</b></div>
          ${run.siteProfile.assetHygiene?.blockingScriptsTotal ? `<div class="warn">⚠️ <b>${run.siteProfile.assetHygiene.blockingScriptsTotal} Blocking Script(s)</b></div>` : ''}
          ${run.siteProfile.funnel?.brokenLinks?.length ? `<div class="bad">🚨 <b>${run.siteProfile.funnel.brokenLinks.length} Broken Link(s)</b></div>` : ''}
          ${leadSummary(run.siteProfile)}
          ${seo ? `<div>🔎 <b>${esc(String(seo.score))}/100</b> search${seoIssue ? ` · ${esc(seoIssue.detail.slice(0, 80))}` : ''}</div>` : ''}
        </div>
      </div>
    ` : ''}
    ${run.shareToken ? `<div class="card"><div class="kicker">Share</div>
      <div class="row toolbar">
        <input class="field" id="share-link" readonly value="${esc(new URL(api.sharePageUrl(run.shareToken), location.href).href)}" aria-label="Share link">
        <button class="btn" id="copy-share" type="button">Copy</button>
        <a class="btn" href="${esc(api.sharePageUrl(run.shareToken))}" target="_blank" rel="noopener">Open</a>
      </div></div>` : ''}
    ${run.status === 'done' ? `<div class="row toolbar">
      <input class="field" type="text" id="agency-name" placeholder="Brand / Agency (optional)" value="${esc(savedAgency)}" title="Whitelabel brand for executive report">
      <a class="btn primary" id="btn-download-report" href="${api.reportUrl(run.id, { download: '1', agency: savedAgency || undefined })}" download>Download report</a>
      <a class="btn" id="btn-view-report" href="${api.reportUrl(run.id, { agency: savedAgency || undefined })}" target="_blank" rel="noopener">View report</a>
      <a class="btn" href="${api.pdfUrl(run.id)}" target="_blank" rel="noopener">PDF</a>
      <button class="btn" id="promote-all">Set all captures as baseline</button>
    </div>
      <div class="card cta">
        <h3>Turn audit findings into high-converting UX</h3>
        <p class="muted sm">Open the executive report for a client-ready assessment, or request a remediation plan for the mobile and accessibility defects.</p>
        <a class="btn primary" href="${api.reportUrl(run.id, { agency: savedAgency || undefined })}" target="_blank">View executive report</a>
      </div>` : ''}
    ${run.error ? `<p class="msg bad">${esc(run.error)}</p>` : ''}
    ${run.status === 'crawling' && run.crawlMessage ? `<p class="muted">${esc(run.crawlMessage)}</p>` : ''}
    ${active ? '<div class="bar"><i style="width:' + (run.progress.capturesTotal ? Math.round(((run.progress.capturesDone || 0) / run.progress.capturesTotal) * 100) : 8) + '%"></i></div>' : ''}
    ${run.pages.length ? `
      <div class="toolbar">
        <input class="field" type="search" id="page-search" placeholder="Search pages..." value="${esc(query)}">
        <div class="filters">
          ${['all', 'error', 'warn', 'changed'].map((f) => `<button class="btn ${filter === f ? 'primary' : ''}" data-filter="${f}">${f.toUpperCase()}</button>`).join('')}
        </div>
        <small class="muted">Showing ${filtered.length}/${run.pages.length} pages</small>
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
  document.getElementById('copy-share')?.addEventListener('click', async () => {
    const input = document.getElementById('share-link');
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand('copy');
    }
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
bindNavApi();

