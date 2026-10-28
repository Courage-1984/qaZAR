/** Pure Cloudflare Quick Tunnel spawn args and ready timeout. */

export const TUNNEL_READY_MS = 15_000;

export function cloudflaredTunnelArgs(port = 8787) {
  return ['tunnel', '--url', `http://localhost:${Number(port) || 8787}`];
}

export function discoveryResponse({ localIp, port }) {
  return { localIp, port };
}
