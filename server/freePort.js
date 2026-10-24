import { execSync } from 'node:child_process';
import process from 'node:process';

/**
 * Checks if the target port is currently held by a stale process.
 * If found, terminates that process so the server can bind cleanly.
 */
export async function ensurePortFree(port) {
  try {
    let pids = [];
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const regex = new RegExp(`[:.]${port}\\s+.*LISTENING\\s+(\\d+)`, 'gi');
      for (const match of out.matchAll(regex)) {
        const pid = parseInt(match[1], 10);
        if (pid && pid !== process.pid) pids.push(pid);
      }
    } else {
      const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      pids = out
        .split('\n')
        .map((p) => parseInt(p.trim(), 10))
        .filter((pid) => pid && pid !== process.pid);
    }

    const uniquePids = [...new Set(pids)];
    for (const pid of uniquePids) {
      console.log(`[qaZAR Server] Auto-terminating stale process (PID: ${pid}) on port ${port}...`);
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {
          /* already exited */
        }
      } else {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* already exited */
        }
      }
    }

    if (uniquePids.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      console.log(`[qaZAR Server] Port ${port} freed successfully.`);
    }
  } catch {
    // If inspection fails or no process found, proceed
  }
}
