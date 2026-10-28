/** Shape of /healthz and /api/health JSON. */

export function healthPayload({
  activeRuns = 0,
  db = 'sqlite',
  storage = 'local',
  uptimeSec = Math.round(process.uptime()),
  memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024),
  version = '0.1.0',
} = {}) {
  return {
    ok: true,
    name: 'qaZAR',
    version,
    uptimeSec,
    memoryMb,
    activeRuns,
    db,
    storage,
  };
}
