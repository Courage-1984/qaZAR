
import { Router } from 'express';
import { createRun, getRun, listRuns, removeRun, runPath, save, subscribe } from '../storage/runStore.js';
import { cancelRun, enqueue } from '../queue/jobQueue.js';
import { promoteRun } from '../visual/baseline.js';
import { validateRunInput } from './validate.js';
import { generateExecutiveReport } from '../report/reportGenerator.js';
import { calculateHealthScore } from '../report/scoreCalculator.js';

export const runsRouter = Router();

runsRouter.post('/', async (req, res) => {
  try {
    const input = await validateRunInput(req.body);
    const run = createRun(input);
    enqueue(run.id);
    res.status(202).json({ runId: run.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

runsRouter.get('/', (_req, res) => res.json(listRuns()));

runsRouter.get('/:id', (req, res) => {
  const run = getRun(req.params.id);
  run ? res.json(run) : res.status(404).json({ error: 'Run not found' });
});

runsRouter.get('/:id/report', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const leadEmail = req.query.email || 'consulting@qazar.dev';

  if (req.query.format === 'json' || req.query.json === '1') {
    const health = calculateHealthScore(run);
    return res.json({
      runId: run.id,
      domain: run.input?.domain,
      createdAt: run.createdAt,
      health,
      siteProfile: run.siteProfile || null,
      summary: run.summary || null,
    });
  }

  const html = generateExecutiveReport(run, leadEmail);
  if (req.query.download === '1') {
    const safeDomain = run.input?.domain?.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_') || run.id;
    res.setHeader('Content-Disposition', `attachment; filename="qaZAR-audit-${safeDomain}.html"`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

runsRouter.get('/:id/events', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ status: run.status, progress: run.progress, summary: run.summary })}\n\n`);
  subscribe(run.id, res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  res.on('close', () => clearInterval(keepAlive));
});

runsRouter.post('/:id/baseline', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const { slug, viewport } = req.body || {};
  const promoted = promoteRun(run, runPath(run.id), { slug, viewport });
  save(run);
  res.json({ promoted });
});

runsRouter.delete('/:id', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  cancelRun(run.id);
  removeRun(run.id);
  res.status(204).end();
});
