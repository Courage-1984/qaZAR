import { spawn } from 'node:child_process';
import fs from 'node:fs';

export function findCloudflaredBin() {
  const cfPaths = [
    'cloudflared',
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ];
  for (const p of cfPaths) {
    try {
      if (p === 'cloudflared' || fs.existsSync(p)) return p;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Starts a Cloudflare Quick Tunnel to expose the API publicly over HTTPS,
 * allowing mobile devices and GitHub Pages to connect from outside the local network.
 * @param {number} port
 * @returns {Promise<{ url: string, proc: any } | null>}
 */
export async function startPublicTunnel(port = 8787) {
  return new Promise((resolve) => {
    let settled = false;
    const cfBin = findCloudflaredBin();
    if (!cfBin) return resolve(null);

    try {
      const proc = spawn(cfBin, ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      const onData = (data) => {
        const str = data.toString();
        const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
        if (match && !settled) {
          settled = true;
          resolve({ url: match[0], proc });
        }
      };

      proc.stdout.on('data', onData);
      proc.stderr.on('data', onData);
      proc.on('error', () => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 15000);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Publishes live discovery metadata (tunnel URL, local IP) to public GitHub Gist
 * so that GitHub Pages on mobile and outside networks can auto-detect and connect.
 */
export async function publishDiscovery({ url, lanUrl, gistId = process.env.DISCOVERY_GIST_ID || '524347c4e86d2457bcb527dc8249e95e' }) {
  try {
    const payload = JSON.stringify({
      files: {
        'qazar-discovery.json': {
          content: JSON.stringify({
            url: url || null,
            lanUrl: lanUrl || null,
            updatedAt: new Date().toISOString(),
          }),
        },
      },
    });
    const proc = spawn('gh', ['api', '-X', 'PATCH', `/gists/${gistId}`, '--input', '-'], {
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    });
    proc.stdin.write(payload);
    proc.stdin.end();
  } catch (err) {
    console.warn('[qaZAR Discovery] Could not publish discovery gist:', err.message);
  }
}

