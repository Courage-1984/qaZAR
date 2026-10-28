import crypto from 'node:crypto';
import { timingSafeEqual } from '../util/timingSafeEqual.js';
import {
  authViaCookie,
  authViaKey,
  authViaPages,
  parseApiKeysList,
  readBearerToken,
  readNamedCookie,
} from './keyParse.js';

const COOKIE = 'qazar_session';

let cachedRaw = null;
let cachedKeys = [];

export function loadApiKeys(raw = process.env.QAZAR_API_KEYS || '') {
  if (raw === cachedRaw) return cachedKeys;
  cachedRaw = raw;
  cachedKeys = parseApiKeysList(raw);
  return cachedKeys;
}

export function operatorToken(secret = process.env.QAZAR_OPERATOR_KEY || '') {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update('qazar-operator').digest('hex');
}

export function readBearer(req) {
  return readBearerToken(req.get('authorization') || '');
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
    req.auth = authViaKey(key);
    return next();
  }
  const token = readNamedCookie(req.get('cookie') || '', COOKIE);
  if (token && timingSafeEqual(token, operatorToken())) {
    req.auth = authViaCookie();
    return next();
  }
  req.auth = authViaPages();
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
