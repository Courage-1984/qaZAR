import { Router } from 'express';
import { createRun, getRun, listRuns, removeRun, runPath, save, subscribe } from '../storage/runStore.js';
import { cancelRun, enqueue } from '../queue/jobs.js';
import { promoteRun } from '../visual/baseline.js';
import { validateRunInput } from './validate.js';
import { generateExecutiveReport } from '../report/reportGenerator.js';
import { assertInflight } from '../quota/enforce.js';
import { storage } from '../storage/storageAdapter.js';
import fs from 'node:fs';

export const runsRouter = Router();

function scope(req) {
  return req.auth?.via === 'key' ? req.auth.ownerId : null;
}

async function owned(req, id) {
  return getRun(id, { ownerId: scope(req) });
}

runsRouter.post('/', async (req, res) => {
  try {
    const limits = await assertInflight(req.auth);
    const input = await validateRunInput(req.body, {
      publicCaller: Boolean(req.auth?.publicCaller),
      pageCap: limits.pageCap,
    });
    const run = await createRun(input, { ownerId: req.auth?.ownerId || 'operator' });
    await enqueue(run.id, 'audit');
    res.status(202).json({ runId: run.id, shareToken: run.shareToken });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

runsRouter.get('/', async (req, res) => res.json(await listRuns({ ownerId: scope(req) })));

runsRouter.get('/:id', async (req, res) => {
  const run = await owned(req, req.params.id);
  run ? res.json(run) : res.status(404).json({ error: 'Not found' });
});

runsRouter.get('/:id/report', async (req, res) => {
  const run = await owned(req, req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const leadEmail = req.query.email || process.env.AGENCY_INBOX || 'consulting@qazar.dev';
  const agency = req.query.agency || req.query.brand || null;
  const html = generateExecutiveReport(run, leadEmail, { agency });
  if (req.query.download === '1') {
    const safeDomain = run.input?.domain?.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_') || run.id;
    res.setHeader('Content-Disposition', `attachment; filename="qaZAR-audit-${safeDomain}.html"`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

runsRouter.get('/:id/report.pdf', async (req, res) => {
  const run = await owned(req, req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const file = storage.getArtifactPath(run.id, 'report.pdf');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(file);
});

runsRouter.get('/:id/events', async (req, res) => {
  const run = await owned(req, req.params.id);
  if (!run) return res.status(404).end();
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`:${' '.repeat(4096)}\n\n`);
  const push = async () => {
    const current = await owned(req, req.params.id);
    if (!current) return;
    res.write(`data: ${JSON.stringify({ status: current.status, progress: current.progress, summary: current.summary })}\n\n`);
  };
  await push();
  subscribe(run.id, res);
  const keepAlive = setInterval(() => {
    push().catch(() => clearInterval(keepAlive));
  }, 2000);
  res.on('close', () => clearInterval(keepAlive));
});

runsRouter.post('/:id/baseline', async (req, res) => {
  const run = await owned(req, req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const { slug, viewport } = req.body || {};
  const promoted = promoteRun(run, runPath(run.id), { slug, viewport });
  await save(run);
  res.json({ promoted });
});

runsRouter.delete('/:id', async (req, res) => {
  const run = await owned(req, req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  await cancelRun(run.id);
  await removeRun(run.id, { ownerId: scope(req) });
  res.status(204).end();
});
