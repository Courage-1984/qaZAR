import { Router } from 'express';
import fs from 'node:fs';
import { getByShareToken } from '../storage/runStore.js';
import { storage } from '../storage/storageAdapter.js';
import { calculateHealthScore } from '../report/scoreCalculator.js';

const missing = { error: 'Not found' };

export const shareRouter = Router();

function runFor(token) {
  return getByShareToken(token);
}

shareRouter.get('/:token/report.pdf', (req, res) => {
  const run = runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  const file = storage.getArtifactPath(run.id, 'report.pdf');
  if (!fs.existsSync(file)) return res.status(404).json(missing);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(file);
});

shareRouter.get('/:token', (req, res) => {
  const run = runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  const scored = run.status === 'done' ? calculateHealthScore(run) : null;
  res.json({
    status: run.status,
    progress: run.progress || null,
    domain: run.input?.domain || '',
    coverage: scored?.metrics?.coverageLine || null,
  });
});
