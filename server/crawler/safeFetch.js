import zlib from 'node:zlib';
import { assertPublicUrl } from '../routes/validate.js';
import {
  MAX_FETCH_BYTES,
  MAX_REDIRECT_HOPS,
  contentLengthExceeds,
  isGzipMagic,
  isRedirectStatus,
  resolveRedirectTarget,
} from './fetchBounds.js';

const UA = { 'user-agent': 'qaZAR/0.1' };

/** Follow redirects one hop at a time and reject any private target. */
export async function fetchPublic(url, { timeout = 15000, label = 'url', fetchImpl = fetch } = {}) {
  let current = await assertPublicUrl(url, label);
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    const res = await fetchImpl(current, {
      headers: UA,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
    });
    if (isRedirectStatus(res.status)) {
      const next = resolveRedirectTarget(current, res.headers.get('location'));
      if (!next) throw new Error(`${label} redirect is missing a location`);
      current = await assertPublicUrl(next, label);
      continue;
    }
    return res;
  }
  throw new Error(`${label} redirected too many times`);
}

/** Read a response body, refusing anything larger than 2 MB. */
export async function readCapped(res, max = MAX_FETCH_BYTES) {
  if (contentLengthExceeds(res.headers.get('content-length'), max)) {
    throw new Error('response exceeds 2MB');
  }
  if (!res.body?.getReader) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > max) throw new Error('response exceeds 2MB');
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new Error('response exceeds 2MB');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/** fetchPublic plus a capped, optionally gzip-decoded text body. */
export async function fetchPublicText(url, opts = {}) {
  const res = await fetchPublic(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  let buf = await readCapped(res);
  if (isGzipMagic(buf)) {
    buf = zlib.gunzipSync(buf, { maxOutputLength: MAX_FETCH_BYTES });
  }
  return { text: buf.toString('utf8'), status: res.status, headers: res.headers };
}
