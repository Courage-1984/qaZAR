export const MAX_FETCH_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECT_HOPS = 5;

export function isRedirectStatus(status) {
  return status >= 300 && status < 400 && status !== 304;
}

export function contentLengthExceeds(headerValue, max = MAX_FETCH_BYTES) {
  const declared = Number(headerValue);
  return Number.isFinite(declared) && declared > max;
}

export function isGzipMagic(buf) {
  return Boolean(buf && buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b);
}

/** Resolve a Location header against the current request URL. */
export function resolveRedirectTarget(current, location) {
  if (!location) return null;
  return new URL(location, current).toString();
}
