/** Parse QAZAR_API_KEYS entries: keyId.secret….ownerId */

export function parseApiKeyEntry(part) {
  const bits = String(part || '').trim().split('.');
  if (bits.length < 3) return null;
  return {
    keyId: bits[0],
    secret: bits.slice(1, -1).join('.'),
    ownerId: bits[bits.length - 1],
  };
}

export function parseApiKeysList(raw = '') {
  const keys = [];
  for (const part of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    const entry = parseApiKeyEntry(part);
    if (entry) keys.push(entry);
  }
  return keys;
}

/** Read one cookie value from a Cookie header. */
export function readNamedCookie(header, name) {
  for (const bit of String(header || '').split(';')) {
    const [cookieName, ...rest] = bit.trim().split('=');
    if (cookieName === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function readBearerToken(authorization = '') {
  const header = String(authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function authViaKey(key) {
  return {
    keyId: key.keyId,
    ownerId: key.ownerId,
    via: 'key',
    publicCaller: key.ownerId !== 'operator',
  };
}

export function authViaCookie() {
  return { keyId: 'operator', ownerId: 'operator', via: 'cookie', publicCaller: false };
}

export function authViaPages() {
  return { keyId: 'pages', ownerId: 'operator', via: 'pages', publicCaller: false };
}
