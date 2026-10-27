import net from 'node:net';
import { assertPublicUrl, isPrivateIp } from '../routes/validate.js';

/** Literal private IPs and cloud-metadata style hosts (no DNS lookup). */
export function isBlockedHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return false;
  if (h === 'metadata.google.internal' || h.endsWith('.internal') || h === 'kubernetes.default') return true;
  if (net.isIP(h) && isPrivateIp(h)) return true;
  return false;
}

/**
 * Abort private-IP / metadata subresources; DNS-check document navigations.
 * Attach to a BrowserContext or Page before goto.
 */
export async function installNavGuard(target) {
  await target.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    try {
      const u = new URL(url);
      if ((u.protocol === 'http:' || u.protocol === 'https:') && isBlockedHost(u.hostname)) {
        return route.abort('blockedbyclient');
      }
    } catch {
      /* data:/blob: etc */
    }
    if (req.resourceType() === 'document') {
      try { await assertPublicUrl(url, 'nav'); }
      catch { return route.abort('blockedbyclient'); }
    }
    return route.continue();
  });
}
