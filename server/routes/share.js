import { Router } from 'express';
import fs from 'node:fs';
import { getByShareToken } from '../storage/runStore.js';
import { storage } from '../storage/storageAdapter.js';
import { buildSharePayload, isShareToken } from './sharePayload.js';

const missing = { error: 'Not found' };

export const shareRouter = Router();

async function runFor(token) {
  if (!isShareToken(token)) return null;
  return getByShareToken(token);
}

function pdfPath(runId) {
  return storage.getArtifactPath(runId, 'report.pdf');
}

function hasPdf(runId) {
  if (typeof storage.hasArtifact === 'function' && storage.hasArtifact(runId, 'report.pdf')) return true;
  return fs.existsSync(pdfPath(runId));
}

shareRouter.get('/:token/report.pdf', async (req, res) => {
  const run = await runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  const file = pdfPath(run.id);
  if (!fs.existsSync(file)) return res.status(404).json(missing);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(file);
});

shareRouter.get('/:token', async (req, res) => {
  const run = await runFor(req.params.token);
  if (!run) return res.status(404).json(missing);
  res.json(buildSharePayload(run, hasPdf(run.id)));
});
