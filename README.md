# qaZAR

Viewport UI/UX QA & visual regression testing suite. Crawls a site (sitemap or BFS), captures every page at 7 viewports with Playwright, runs DOM heuristics, and pixel-diffs against baselines.

**Live UI:** https://courage-1984.github.io/qaZAR/ (static; needs a running API – see below)

## Quick start

```bash
npm install
npx playwright install chromium
npm run server          # API on http://localhost:8787
npm run dev:web         # UI dev server (or use the hosted Pages UI)
npm test
```

On the Submit page, set **API base URL** (default `http://localhost:8787`). Playwright cannot run on GitHub Pages, so the API must run locally/Docker/VPS.

## API

| Route | Purpose |
|---|---|
| `POST /api/runs` | `{domain, sitemap_url?, max_pages}` → `202 {runId}` |
| `GET /api/runs` / `GET /api/runs/:id` | list / detail (poll for progress) |
| `GET /api/runs/:id/events` | SSE progress |
| `POST /api/runs/:id/baseline` | promote captures (`{slug?, viewport?}`) |
| `DELETE /api/runs/:id` | remove run |
| `GET /api/artifacts/:runId/...` | screenshots / diffs |

Env: `PORT`, `DATA_DIR`, `PAGE_CONCURRENCY`, `ALLOW_PRIVATE=1` (allow localhost/private targets).

## Phase 1 status
- Viewports: ultrawide, fhd, macbook, desktop, laptop, tablet, mobile
- Heuristics: horizontal overflow, touch targets (touch viewports), body/text font size, media bleed
- Visual regression: first run auto-baselines; later runs diff with pixelmatch
- Planned (Phase 2): contrast, heading scaling across viewports, collisions, nav collapse

See the implementation plan in the project history for details.
