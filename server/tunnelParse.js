/** Pure helpers for Cloudflare quick-tunnel discovery. */

const TRY_CF = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export function parseTryCloudflareUrl(chunk = '') {
  const match = String(chunk).match(TRY_CF);
  return match ? match[0] : null;
}

export const DEFAULT_DISCOVERY_GIST = '524347c4e86d2457bcb527dc8249e95e';

export function discoveryGistId(env = process.env) {
  return env.DISCOVERY_GIST_ID || DEFAULT_DISCOVERY_GIST;
}

export function buildDiscoveryPayload({ url = null, lanUrl = null, updatedAt = new Date().toISOString() } = {}) {
  return {
    files: {
      'qazar-discovery.json': {
        content: JSON.stringify({
          url: url || null,
          lanUrl: lanUrl || null,
          updatedAt,
        }),
      },
    },
  };
}

export function cloudflaredCandidates(platform = process.platform) {
  const list = ['cloudflared'];
  if (platform === 'win32') {
    list.push(
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
    );
  }
  return list;
}
