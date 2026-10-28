import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export function ipOf(req) {
  return ipKeyGenerator(req.ip || '127.0.0.1');
}

export function postsOnly(req) {
  return req.method !== 'POST';
}

export function getsOnly(req) {
  return req.method !== 'GET';
}

function limit({ windowMs, max, keyGenerator, skip }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    ...(skip ? { skip } : {}),
  });
}

/** Default qaZAR API limiters (shared window sizes pinned for characterisation). */
export function createApiLimiters() {
  return {
    postByIp: limit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: ipOf, skip: postsOnly }),
    postByKey: limit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyGenerator: (req) => req.auth?.keyId || ipOf(req),
      skip: postsOnly,
    }),
    shareByIp: limit({ windowMs: 60 * 1000, max: 60, keyGenerator: ipOf }),
    billingByKey: limit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      keyGenerator: (req) => req.auth?.keyId || ipOf(req),
    }),
    readByIp: limit({
      windowMs: 60 * 1000,
      max: 120,
      keyGenerator: ipOf,
      skip: getsOnly,
    }),
  };
}

export const LIMIT_CAPS = {
  postByIp: { windowMs: 15 * 60 * 1000, max: 10 },
  postByKey: { windowMs: 15 * 60 * 1000, max: 30 },
  shareByIp: { windowMs: 60 * 1000, max: 60 },
  billingByKey: { windowMs: 15 * 60 * 1000, max: 20 },
  readByIp: { windowMs: 60 * 1000, max: 120 },
};
