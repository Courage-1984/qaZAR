import { Router } from 'express';
import { createRun, getRun, listRuns, removeRun, runPath, save, subscribe } from '../storage/runStore.js';
import { cancelRun, enqueue } from '../queue/jobQueue.js';
import { promoteRun } from '../visual/baseline.js';
import { validateRunInput } from './validate.js';

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

runsRouter.get('/:id/events', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering on Nginx reverse proxy
  });
  res.flushHeaders?.();

  // Initial event
  res.write(`data: ${JSON.stringify({ status: run.status, progress: run.progress, summary: run.summary })}\n\n`);
  subscribe(run.id, res);

  // Keep-alive heartbeat every 15s for reverse proxies
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
