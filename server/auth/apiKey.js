import crypto from 'node:crypto';
import { timingSafeEqual } from '../util/timingSafeEqual.js';

const COOKIE = 'qazar_session';

let cachedRaw = null;
let cachedKeys = [];

export function loadApiKeys(raw = process.env.QAZAR_API_KEYS || '') {
  if (raw === cachedRaw) return cachedKeys;
  const keys = [];
  for (const part of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    const bits = part.split('.');
    if (bits.length < 3) continue;
    keys.push({
      keyId: bits[0],
      secret: bits.slice(1, -1).join('.'),
      ownerId: bits[bits.length - 1],
    });
  }
  cachedRaw = raw;
  cachedKeys = keys;
  return keys;
}

function cookieValue(req) {
  const header = req.get('cookie') || '';
  for (const bit of header.split(';')) {
    const [name, ...rest] = bit.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function operatorToken(secret = process.env.QAZAR_OPERATOR_KEY || '') {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update('qazar-operator').digest('hex');
}

export function readBearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/**
 * A valid bearer key is scoped to its owner. A bad bearer is 401.
 * GitHub Pages calls the tunnel with no key and no cross-site cookie, so that
 * console stays signed in as the operator.
 */
export function attachAuth(req, res, next) {
  const bearer = readBearer(req);
  if (bearer) {
    const key = loadApiKeys().find((item) => timingSafeEqual(item.secret, bearer));
    if (!key) return res.status(401).json({ error: 'Unauthorized' });
    req.auth = {
      keyId: key.keyId,
      ownerId: key.ownerId,
      via: 'key',
      publicCaller: key.ownerId !== 'operator',
    };
    return next();
  }
  const token = cookieValue(req);
  if (token && timingSafeEqual(token, operatorToken())) {
    req.auth = { keyId: 'operator', ownerId: 'operator', via: 'cookie', publicCaller: false };
    return next();
  }
  req.auth = { keyId: 'pages', ownerId: 'operator', via: 'pages', publicCaller: false };
  next();
}

export function setOperatorCookie(req, res) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  const parts = [
    `${COOKIE}=${encodeURIComponent(operatorToken())}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=43200',
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export { COOKIE };
