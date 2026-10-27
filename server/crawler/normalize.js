import crypto from 'node:crypto';

const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$)/i;
const ASSET = /\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|gz|mp4|webm|mp3|css|js|json|xml|txt|woff2?|ttf)$/i;

/** Normalize a URL: drop hash/tracking params/trailing slash. Returns null if invalid or not http(s). */
export function normalizeUrl(raw, base) {
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.toString();
}

export const isAssetUrl = (url) => ASSET.test(new URL(url).pathname);
export const sameOrigin = (a, b) => new URL(a).origin === new URL(b).origin;
export const sameHost = (a, b) => {
  try {
    return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase();
  } catch {
    return false;
  }
};

/** Filesystem-safe, collision-resistant slug for a page URL. */
export function slugFor(url) {
  const u = new URL(url);
  const base = (u.pathname === '/' ? 'home' : u.pathname.replace(/^\/|\/$/g, ''))
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'page';
  const h = crypto.createHash('sha1').update(u.pathname + u.search).digest('hex').slice(0, 6);
  return `${base}-${h}`;
}

export const siteHash = (url) => crypto.createHash('sha1').update(new URL(url).origin).digest('hex').slice(0, 10);
