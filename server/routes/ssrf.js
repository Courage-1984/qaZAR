import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from '../config.js';

/** Last 32 bits of a dotted or hex IPv4 embedded in ::ffff: or 64:ff9b:: (any expansion). */
export function embeddedIpv4(host) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIPv4(h)) return h;
  const dotted = h.match(/(?:^|:)(?:ffff:|64:ff9b:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted && net.isIPv4(dotted[1])) return dotted[1];
  const hex = h.match(/(?:^|:)(?:ffff:|64:ff9b:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex || (!h.includes('ffff:') && !h.includes('64:ff9b:'))) return null;
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isPrivateV4(a, b) {
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
}

export function isPrivateIp(ip) {
  const v4 = embeddedIpv4(ip);
  if (v4) {
    const [a, b] = v4.split('.').map(Number);
    return isPrivateV4(a, b);
  }
  const l = String(ip).toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}

/** Cloud metadata / cluster DNS names — blocked even when ALLOW_PRIVATE=1. */
export function isMetadataHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return false;
  return h === 'metadata.google.internal' || h.endsWith('.internal') || h === 'kubernetes.default';
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
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (isMetadataHost(host)) throw new Error(`${label} host is not allowed`);
  if (config.allowPrivate) return u.toString();
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error(`${label} host could not be resolved`);
  if (addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error(`${label} resolves to a private address (set ALLOW_PRIVATE=1 to allow)`);
  }
  return u.toString();
}

/** Empty string when absent; throws on malformed addresses. */
export function parseProspectEmail(raw) {
  const email = String(raw || '').trim();
  if (!email) return '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('prospectEmail is not a valid email');
  }
  return email;
}
