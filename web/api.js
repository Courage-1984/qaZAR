const KEY = 'qazar.apiBase';
const GIST_API = 'https://api.github.com/gists/524347c4e86d2457bcb527dc8249e95e';
const GIST_RAW = 'https://gist.githubusercontent.com/Courage-1984/524347c4e86d2457bcb527dc8249e95e/raw/qazar-discovery.json';

export const getApiBase = () => {
  if (typeof location !== 'undefined') {
    const qApi = new URLSearchParams(location.search).get('api') || new URLSearchParams(location.hash.slice(1)).get('api');
    if (qApi) {
      localStorage.setItem(KEY, qApi.trim());
      return qApi.trim().replace(/\/+$/, '');
    }
  }

  const stored = localStorage.getItem(KEY);
  if (stored) return stored.replace(/\/+$/, '');

  if (typeof location !== 'undefined' && location.origin) {
    if (!location.hostname.endsWith('github.io')) {
      if (location.port === '8787' || !location.port) {
        return location.origin.replace(/\/+$/, '');
      }
      const proto = location.protocol === 'https:' ? 'https:' : 'http:';
      return `${proto}//${location.hostname}:8787`;
    }
  }
  return 'http://localhost:8787';
};

export const setApiBase = (v) => localStorage.setItem(KEY, (v || '').trim().replace(/\/+$/, ''));

export async function autoDiscoverApi() {
  const current = getApiBase();
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';

  // If current base is already working, return it
  if (!isHttps || current.startsWith('https://')) {
    try {
      const res = await fetch(current + '/api/health', { signal: AbortSignal.timeout(2000) });
      if (res.ok) return current;
    } catch {
      /* try discovery */
    }
  }

  // 1. Check live GitHub Gist API (fast, un-cached, CORS enabled)
  try {
    const res = await fetch(GIST_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const gist = await res.json();
      const content = gist.files?.['qazar-discovery.json']?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.url) {
          const testRes = await fetch(parsed.url + '/api/health', { signal: AbortSignal.timeout(3500) });
          if (testRes.ok) {
            setApiBase(parsed.url);
            return parsed.url;
          }
        }
      }
    }
  } catch {
    /* fallback to raw gist */
  }

  // 2. Fallback to raw gist URL with cache buster
  try {
    const rawRes = await fetch(`${GIST_RAW}?t=${Date.now()}`, { signal: AbortSignal.timeout(3000) });
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      if (parsed?.url) {
        const testRes = await fetch(parsed.url + '/api/health', { signal: AbortSignal.timeout(3500) });
        if (testRes.ok) {
          setApiBase(parsed.url);
          return parsed.url;
        }
      }
    }
  } catch {
    /* discovery exhausted */
  }

  return null;
}

async function req(path, opts) {
  let base = getApiBase();
  try {
    const res = await fetch(base + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  } catch (err) {
    // If request fails on GitHub Pages or insecure localhost, attempt auto-discovery once
    const isGithubIo = typeof location !== 'undefined' && location.hostname.endsWith('github.io');
    if (isGithubIo || !base.includes('trycloudflare.com')) {
      const discovered = await autoDiscoverApi();
      if (discovered && discovered !== base) {
        const retryRes = await fetch(discovered + path, {
          ...opts,
          headers: { 'Content-Type': 'application/json' },
        });
        if (retryRes.status === 204) return null;
        const retryBody = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) throw new Error(retryBody.error || `HTTP ${retryRes.status}`);
        return retryBody;
      }
    }
    throw err;
  }
}

export const api = {
  health: () => req('/api/health'),
  autoDiscover: autoDiscoverApi,
  createRun: (data) => req('/api/runs', { method: 'POST', body: JSON.stringify(data) }),
  listRuns: () => req('/api/runs'),
  getRun: (id) => req(`/api/runs/${encodeURIComponent(id)}`),
  deleteRun: (id) => req(`/api/runs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  promote: (id, body = {}) => req(`/api/runs/${encodeURIComponent(id)}/baseline`, { method: 'POST', body: JSON.stringify(body) }),
  artifact: (runId, rel) => `${getApiBase()}/api/artifacts/${encodeURIComponent(runId)}/${rel.split('/').map(encodeURIComponent).join('/')}`,
  eventsUrl: (id) => `${getApiBase()}/api/runs/${encodeURIComponent(id)}/events`,
  reportUrl: (id, opts = {}) => {
    const p = typeof opts === 'boolean' ? (opts ? { download: '1' } : {}) : { ...opts };
    const q = new URLSearchParams(p).toString();
    return `${getApiBase()}/api/runs/${encodeURIComponent(id)}/report${q ? '?' + q : ''}`;
  },
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
