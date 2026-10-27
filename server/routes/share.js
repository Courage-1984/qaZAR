import { Router } from 'express';
import fs from 'node:fs';
import { getByShareToken } from '../storage/runStore.js';
import { storage } from '../storage/storageAdapter.js';
import { calculateHealthScore } from '../report/scoreCalculator.js';
import { reviewFindings } from '../report/findingReview.js';

const missing = { error: 'Not found' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const shareRouter = Router();

async function runFor(token) {
  if (!token || !UUID.test(token)) return null;
  return getByShareToken(token);
}

shareRouter.get('/:token/report.pdf', async (req, res) => {
  const run = await runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  const file = storage.getArtifactPath(run.id, 'report.pdf');
  if (!fs.existsSync(file)) return res.status(404).json(missing);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(file);
});

shareRouter.get('/:token', async (req, res) => {
  const run = await runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  const scored = run.status === 'done' ? calculateHealthScore(run) : null;
  const review = run.status === 'done' ? reviewFindings(run).counts : null;
  const hasPdf = storage.hasArtifact?.(run.id, 'report.pdf')
    || fs.existsSync(storage.getArtifactPath(run.id, 'report.pdf'));
  res.json({
    status: run.status,
    progress: run.progress || null,
    domain: run.input?.domain || '',
    coverage: scored?.metrics?.coverageLine || null,
    score: scored?.score ?? null,
    review,
    hasPdf: Boolean(hasPdf),
    finishedAt: run.finishedAt || null,
    error: run.status === 'failed' ? (run.error || 'failed') : null,
  });
});
