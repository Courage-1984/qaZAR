import net from 'node:net';
import { assertPublicUrl, isPrivateIp } from '../routes/validate.js';

/** Literal private IPs and cloud-metadata style hosts (no DNS lookup). */
export function isBlockedHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return false;
  if (h === 'metadata.google.internal' || h.endsWith('.internal') || h === 'kubernetes.default') {
    return true;
  }
  return net.isIP(h) > 0 && isPrivateIp(h);
}

/** True when the URL is http(s) to a host blocked without DNS. */
export function blockedHttpUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return isBlockedHost(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Sync host block + async document SSRF check.
 * Returns `'abort'` or `'continue'`.
 */
export async function decideNav(url, resourceType) {
  if (blockedHttpUrl(url)) return 'abort';
  if (resourceType !== 'document') return 'continue';
  try {
    await assertPublicUrl(url, 'nav');
    return 'continue';
  } catch {
    return 'abort';
  }
}

/**
 * Abort private-IP / metadata subresources; DNS-check document navigations.
 * Attach to a BrowserContext or Page before goto.
 */
export async function installNavGuard(target) {
  await target.route('**/*', async (route) => {
    const req = route.request();
    if ((await decideNav(req.url(), req.resourceType())) === 'abort') {
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}
