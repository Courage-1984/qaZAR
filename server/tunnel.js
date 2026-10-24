import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Starts a Cloudflare Quick Tunnel to expose the API publicly over HTTPS,
 * allowing mobile devices and GitHub Pages to connect from outside the local network.
 * @param {number} port
 * @returns {Promise<{ url: string, process: any } | null>}
 */
export async function startPublicTunnel(port = 8787) {
  return new Promise((resolve) => {
    let settled = false;
    const cfPaths = [
      'cloudflared',
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
    ];

    let cfBin = null;
    for (const p of cfPaths) {
      try {
        if (p === 'cloudflared' || fs.existsSync(p)) {
          cfBin = p;
          break;
        }
      } catch {
        /* skip */
      }
    }

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
      }, 10000);
    } catch {
      resolve(null);
    }
  });
}
