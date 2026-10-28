/**
 * Reference copy of Logi-Ink workers/audit-proxy (keep in sync with logi-ink repo).
 * Prefer LOGI_INK_API_SECRET via x-api-key; fall back to Bearer QAZAR_API_KEY.
 */
const FORMSPREE = 'https://formspree.io/f/mkgdbljg';
const PRODUCTION_ORIGIN = 'https://logi-ink.co.za';

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = env.ENVIRONMENT === 'production'
    ? origin === PRODUCTION_ORIGIN
    : origin === PRODUCTION_ORIGIN || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers = { 'Content-Type': 'application/json' };
  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request, env) });
}

function qazarBase(env) {
  return String(env.QAZAR_API_BASE || '').replace(/\/$/, '');
}

function qazarHeaders(env) {
  const headers = { 'Content-Type': 'application/json' };
  const logiSecret = String(env.LOGI_INK_API_SECRET || '').trim();
  if (logiSecret) {
    headers['x-api-key'] = logiSecret;
    return headers;
  }
  headers.Authorization = `Bearer ${env.QAZAR_API_KEY || ''}`;
  return headers;
}

async function siteverify(secret, token) {
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  return Boolean(data.success);
}

async function startAudit(env, fields) {
  const domain = fields.get('auditUrl') || '';
  if (!domain) return {};
  let parsed;
  try { parsed = new URL(domain); } catch { throw new Error('https required'); }
  if (parsed.protocol !== 'https:') throw new Error('https required');
  const res = await fetch(`${qazarBase(env)}/api/runs`, {
    method: 'POST',
    headers: qazarHeaders(env),
    body: JSON.stringify({
      domain,
      max_pages: 5,
      prospectEmail: fields.get('email') || '',
      prospectName: fields.get('name') || '',
      source: 'logi-ink',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('audit request failed');
  const data = await res.json();
  return { shareToken: data.shareToken };
}

async function forwardForm(env, fields) {
  const body = new FormData();
  for (const name of ['name', 'email', 'phone', 'subject', 'message']) {
    if (fields.get(name)) body.append(name, fields.get(name));
  }
  await fetch(env.FORMSPREE_URL || FORMSPREE, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method === 'GET' && url.pathname.startsWith('/audit/')) {
      const token = url.pathname.slice('/audit/'.length);
      const res = await fetch(`${qazarBase(env)}/api/share/${encodeURIComponent(token)}`);
      const payload = await res.json().catch(() => ({ error: 'Not found' }));
      return json(request, env, payload, res.status);
    }
    if (request.method !== 'POST' || url.pathname !== '/audit') {
      return json(request, env, { error: 'Not found' }, 404);
    }
    const fields = await request.formData();
    if (String(fields.get('website') || '').trim()) {
      return json(request, env, { error: 'Submission failed. Please try again.' }, 400);
    }
    const ok = await siteverify(env.RECAPTCHA_SECRET, fields.get('g-recaptcha-response'));
    if (!ok) return json(request, env, { error: 'Submission failed. Please try again.' }, 400);
    try {
      const audit = await startAudit(env, fields);
      await forwardForm(env, fields);
      return json(request, env, audit.shareToken ? { shareToken: audit.shareToken } : { ok: true });
    } catch {
      return json(request, env, { error: 'Submission failed. Please try again.' }, 400);
    }
  },
};
