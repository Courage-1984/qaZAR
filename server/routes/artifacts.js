import fs from 'node:fs';
import path from 'node:path';
import { getRun } from '../storage/runStore.js';
import { storage } from '../storage/storageAdapter.js';
import { canReadArtifact, isPathInside, parseArtifactPath } from './artifactAccess.js';

/** Screenshots for the Pages console. A bearer key may only read its own runs. */
export async function artifactHandler(req, res) {
  const parsed = parseArtifactPath(req.path);
  if (!parsed) return res.status(404).json({ error: 'Not found' });
  const run = await getRun(parsed.runId);
  if (!canReadArtifact(req.auth, run, parsed.rel)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { rel } = parsed;
  if (storage.driver !== 'local') {
    const buf = await storage.readArtifact(run.id, rel);
    if (!buf) return res.status(404).json({ error: 'Not found' });
    res.type(path.extname(rel) || 'application/octet-stream');
    return res.send(buf);
  }
  const root = path.resolve(storage.getRunDir(run.id));
  const abs = path.resolve(storage.getArtifactPath(run.id, rel));
  if (!isPathInside(root, abs) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(abs);
}
