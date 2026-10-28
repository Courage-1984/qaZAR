import { spawn } from 'node:child_process';
import fs from 'node:fs';
import {
  buildDiscoveryPayload,
  cloudflaredCandidates,
  discoveryGistId,
  parseTryCloudflareUrl,
} from './tunnelParse.js';
import { TUNNEL_READY_MS, cloudflaredTunnelArgs } from './tunnelArgs.js';

export function findCloudflaredBin() {
  for (const p of cloudflaredCandidates()) {
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
      const proc = spawn(cfBin, cloudflaredTunnelArgs(port), {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      const onData = (data) => {
        const url = parseTryCloudflareUrl(data.toString());
        if (url && !settled) {
          settled = true;
          resolve({ url, proc });
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
      }, TUNNEL_READY_MS);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Publishes live discovery metadata (tunnel URL, local IP) to public GitHub Gist
 * so that GitHub Pages on mobile and outside networks can auto-detect and connect.
 */
export async function publishDiscovery({
  url, lanUrl, gistId = discoveryGistId(),
}) {
  try {
    const payload = JSON.stringify(buildDiscoveryPayload({ url, lanUrl }));
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
