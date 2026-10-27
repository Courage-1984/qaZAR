import os from 'node:os';

/** First non-internal IPv4 address, or null when none are available. */
export function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  } catch {
    /* fallback */
  }
  return null;
}
