import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from '../config.js';
import { resolveExplicitPages } from '../crawler/explicitPages.js';

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
}

/** Throws if URL is not http(s) or resolves to a private address (SSRF guard). */
export async function assertPublicUrl(raw, label) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error(`${label} must be http(s)`);
  if (config.allowPrivate) return u.toString();
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error(`${label} host could not be resolved`);
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error(`${label} resolves to a private address (set ALLOW_PRIVATE=1 to allow)`);
  return u.toString();
}

export async function validateRunInput(body = {}) {
  const domain = await assertPublicUrl(String(body.domain || '').trim(), 'domain');
  let sitemap_url = String(body.sitemap_url || '').trim();
  if (sitemap_url) sitemap_url = await assertPublicUrl(sitemap_url, 'sitemap_url');
  const n = Number.parseInt(body.max_pages ?? 10, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error('max_pages must be a positive integer');
  const listed = resolveExplicitPages(domain, body.pages);
  for (const page of listed) await assertPublicUrl(page, 'page');
  const pages = listed.length ? listed : null;
  const renderJs = Boolean(body.renderJs);
  return {
    domain,
    sitemap_url: pages ? null : sitemap_url || null,
    max_pages: pages ? pages.length : Math.min(n, config.maxPagesCap),
    renderJs,
    pages,
  };
}
