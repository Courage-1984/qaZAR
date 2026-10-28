/** Give a schemeless host/path an https scheme. Paths and real URLs pass through. */
export function ensureHttpScheme(line) {
  const raw = String(line ?? '');
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  if (raw.startsWith('/') || raw.startsWith('?') || raw.startsWith('#')) return raw;
  if (/^[\w.-]+\.[a-z]{2,}([:/]|$)/i.test(raw)) return `https://${raw}`;
  return raw;
}

/** Split textarea or array input into trimmed non-blank, non-comment lines. */
export function pageInputLines(raw) {
  const items = Array.isArray(raw) ? raw : String(raw ?? '').split(/\r?\n/);
  const out = [];
  for (const item of items) {
    const line = String(item ?? '').trim();
    if (!line || line.startsWith('#')) continue;
    out.push(line);
  }
  return out;
}
