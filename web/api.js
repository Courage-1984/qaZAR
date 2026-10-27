const KEY = 'qazar.apiBase';
const GIST_API = 'https://api.github.com/gists/524347c4e86d2457bcb527dc8249e95e';
const GIST_RAW = 'https://gist.githubusercontent.com/Courage-1984/524347c4e86d2457bcb527dc8249e95e/raw/qazar-discovery.json';

const page = () => (typeof location === 'undefined' ? null : location);

/** Turn a pasted value, ?api= link, or origin into an absolute http(s) origin. */
export function normalizeApiBase(raw) {
  if (raw == null) return '';
  let value = String(raw).trim();
  const nested = value.match(/(?:^|[?&#])api=(https?%3A%2F%2F[^&#\s]+|https?:\/\/[^&#\s]+)/i);
  if (nested) {
    try { value = decodeURIComponent(nested[1]); } catch { value = nested[1]; }
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

/** Base this page is allowed to call. GitHub Pages (HTTPS) cannot use localhost. */
export function usableApiBase(raw, loc = page()) {
  const base = normalizeApiBase(raw);
  if (!base) return '';
  if (loc?.protocol === 'https:' && base.startsWith('http://')) return '';
  let host = '';
  try { host = new URL(base).hostname; } catch { return ''; }
  if (loc?.hostname?.endsWith('github.io')) {
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('github.io')) return '';
  }
  return base;
}

function readQuery(loc) {
  if (!loc) return '';
  const q = new URLSearchParams(loc.search).get('api') || new URLSearchParams((loc.hash || '').slice(1)).get('api');
  return usableApiBase(q, loc);
}

export const getApiBase = () => {
  const loc = page();
  const fromQuery = readQuery(loc);
  if (fromQuery) {
    localStorage.setItem(KEY, fromQuery);
    return fromQuery;
  }
  const stored = usableApiBase(localStorage.getItem(KEY), loc);
  if (stored) return stored;
  if (loc?.origin && !loc.hostname.endsWith('github.io')) {
    if (loc.port === '8787' || !loc.port) return loc.origin.replace(/\/+$/, '');
    const proto = loc.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${loc.hostname}:8787`;
  }
  return '';
};

export const setApiBase = (v) => {
  const clean = usableApiBase(v);
  if (clean) localStorage.setItem(KEY, clean);
  else localStorage.removeItem(KEY);
};

function remember(url) {
  const clean = usableApiBase(url);
  if (!clean) return '';
  localStorage.setItem(KEY, clean);
  const loc = page();
  if (loc?.hostname?.endsWith('github.io') && typeof history !== 'undefined') {
    const next = new URL(loc.href);
    if (next.searchParams.get('api') !== clean) {
      next.searchParams.set('api', clean);
      history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
    }
  }
  return clean;
}

async function probe(base) {
  const clean = usableApiBase(base);
  if (!clean) return false;
  try {
    const res = await fetch(`${clean}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const body = await res.json().catch(() => null);
    return res.ok && body?.ok === true && body?.name === 'qaZAR';
  } catch {
    return false;
  }
}

async function gistUrl(url, init) {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000), ...init });
  if (!res.ok) return '';
  const data = await res.json();
  const content = data.files?.['qazar-discovery.json']?.content;
  const parsed = content ? JSON.parse(content) : data;
  return usableApiBase(parsed?.url || '');
}

export async function autoDiscoverApi() {
  const current = getApiBase();
  if (current && await probe(current)) return current;
  let found = '';
  try {
    found = await gistUrl(GIST_API, { headers: { Accept: 'application/vnd.github.v3+json' } });
  } catch { /* raw gist fallback */ }
  if (!found) {
    try { found = await gistUrl(`${GIST_RAW}?t=${Date.now()}`); } catch { /* exhausted */ }
  }
  if (found && await probe(found)) return remember(found);
  return null;
}

async function readBody(res) {
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok || body == null || typeof body !== 'object') {
    throw new Error(body?.error || (res.ok ? 'API returned a non-JSON response' : `HTTP ${res.status}`));
  }
  return body;
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const send = (base) => fetch(base + path, { ...opts, cache: 'no-store', headers });
  let base = getApiBase();
  try {
    if (!base) throw new Error('No API base');
    return await readBody(await send(base));
  } catch (err) {
    const discovered = await autoDiscoverApi();
    if (discovered && discovered !== base) return await readBody(await send(discovered));
    if (!base) throw new Error('No public qaZAR server found. Run npm run server, then retry.');
    throw err;
  }
}

function withKey(key) {
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export const api = {
  health: () => req('/api/health'),
  autoDiscover: autoDiscoverApi,
  createRun: (data) => req('/api/runs', { method: 'POST', body: JSON.stringify(data) }),
  listRuns: () => req('/api/runs'),
  getRun: (id) => req(`/api/runs/${encodeURIComponent(id)}`),
  deleteRun: (id) => req(`/api/runs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  promote: (id, body = {}) => req(`/api/runs/${encodeURIComponent(id)}/baseline`, { method: 'POST', body: JSON.stringify(body) }),
  account: (key) => req('/api/billing/account', { headers: withKey(key) }),
  checkout: (key) => req('/api/billing/checkout', { method: 'POST', headers: withKey(key) }),
  share: (token) => req(`/api/share/${encodeURIComponent(token)}`),
  sharePdfUrl: (token) => `${getApiBase()}/api/share/${encodeURIComponent(token)}/report.pdf`,
  sharePageUrl: (token) => {
    const u = new URL('./share.html', location.href);
    u.searchParams.set('token', token);
    const base = getApiBase();
    if (base) u.searchParams.set('api', base);
    return `${u.pathname.split('/').pop()}?${u.searchParams}`;
  },
  artifact: (runId, rel) => `${getApiBase()}/api/artifacts/${encodeURIComponent(runId)}/${rel.split('/').map(encodeURIComponent).join('/')}`,
  eventsUrl: (id) => `${getApiBase()}/api/runs/${encodeURIComponent(id)}/events`,
  pdfUrl: (id) => `${getApiBase()}/api/runs/${encodeURIComponent(id)}/report.pdf`,
  reportUrl: (id, opts = {}) => {
    const raw = typeof opts === 'boolean' ? (opts ? { download: '1' } : {}) : opts;
    const p = Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null && v !== ''));
    const q = new URLSearchParams(p).toString();
    return `${getApiBase()}/api/runs/${encodeURIComponent(id)}/report${q ? '?' + q : ''}`;
  },
};

/** Keep the public API address on the header links so a copied GitHub Pages URL still connects. */
export function bindNavApi() {
  const base = getApiBase();
  if (!base) return;
  for (const a of document.querySelectorAll('nav a[href]')) {
    const href = a.getAttribute('href');
    if (!href || /^https?:/i.test(href)) continue;
    const u = new URL(href, location.href);
    u.searchParams.set('api', base);
    a.setAttribute('href', `${u.pathname.split('/').pop()}${u.search}`);
  }
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
