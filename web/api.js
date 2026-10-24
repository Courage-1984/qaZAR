const KEY = 'qazar.apiBase';
export const getApiBase = () => (localStorage.getItem(KEY) || 'http://localhost:8787').replace(/\/+$/, '');
export const setApiBase = (v) => localStorage.setItem(KEY, v.trim());

async function req(path, opts) {
  const res = await fetch(getApiBase() + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export const api = {
  health: () => req('/api/health'),
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
