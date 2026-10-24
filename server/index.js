import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config, runsDir } from './config.js';
import { loadAll } from './store/runStore.js';
import { runsRouter } from './routes/runs.js';
import { closeBrowser } from './engine/capturePage.js';

loadAll();
const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'qaZAR' }));
app.use('/api/runs', runsRouter);
app.use('/api/artifacts', express.static(path.resolve(runsDir())));

app.listen(config.port, () => console.log(`qaZAR API listening on http://localhost:${config.port}`));
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});
