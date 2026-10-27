import fs from 'node:fs';
import path from 'node:path';
import { getRun } from '../storage/runStore.js';
import { storage } from '../storage/storageAdapter.js';

/** Screenshots for the Pages console. A bearer key may only read its own runs. */
export async function artifactHandler(req, res) {
  const parts = req.path.split('/').filter(Boolean);
  const runId = parts.shift();
  const rel = parts.join('/');
  if (!runId || !rel || rel.includes('..')) return res.status(404).json({ error: 'Not found' });
  const run = getRun(runId);
  if (!run) return res.status(404).json({ error: 'Not found' });
  if (req.auth?.via === 'key' && run.ownerId !== req.auth.ownerId) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (storage.driver !== 'local') {
    const buf = await storage.readArtifact(run.id, rel);
    if (!buf) return res.status(404).json({ error: 'Not found' });
    res.type(path.extname(rel) || 'application/octet-stream');
    return res.send(buf);
  }
  const root = path.resolve(storage.getRunDir(run.id));
  const abs = path.resolve(storage.getArtifactPath(run.id, rel));
  if (!abs.startsWith(root + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(abs);
}
