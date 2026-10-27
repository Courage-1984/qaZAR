# qaZAR

Viewport UI/UX QA & visual regression testing suite. Crawls a site (sitemap or BFS), captures every page across 7 viewports with Playwright, evaluates active DOM UX/UI heuristics, and pixel-diffs against baselines.

**Live UI:** https://courage-1984.github.io/qaZAR/ (static; needs a running API – see below)

## Quick start

```bash
npm install
npx playwright install chromium
npm run server          # API on http://localhost:8787
npm run dev:web         # UI dev server (or use the hosted Pages UI)
npm test
```

On the Submit page, configure the **API base URL** (defaults to `http://localhost:8787`). Because Playwright runs real browsers in Node, the API runs locally, via Docker, or on a VPS/cloud server while the UI is hosted on GitHub Pages.

## Viewport Configurations

The Playwright engine emulates and isolates these exact viewports for every page:

| Name | Dimensions | Touch / Device Emulation |
|---|---|---|
| `ultrawide` | 2560 × 1600 | `touch: false` |
| `fhd` | 1920 × 1080 | `touch: false` |
| `macbook` | 1512 × 982 | `touch: false` |
| `desktop` | 1440 × 900 | `touch: false` |
| `laptop` | 1100 × 700 | `touch: false` |
| `tablet` | 768 × 1024 | `touch: true`, mobile user-agent |
| `mobile` | 390 × 844 | `touch: true`, mobile user-agent |

## Active UX/UI Heuristic Evaluator

The engine injects evaluations into the DOM on every viewport and flags:

- **Target size (touch viewports)**: WCAG 2.2 AA is 24×24px, with a spacing exception. 44×44px is AAA and is not claimed. Under 48×48px is an optional comfort note.
- **Responsive breakage**: Horizontal scrolling, unclipped offenders, and masked overflow.
- **Typography**: Body text under 16px is a reading suggestion. Heading-scale notes across viewports are advisory.
- **Contrast (WCAG AA)**: Ancestor backgrounds are composited behind the text, then foreground alpha is applied. Image, gradient, and pseudo-element paints are needs-review, not confirmed failures.
- **Overlaps**: A possible overlap. It is described as covering a control only when the overlap includes the centre of a link or button.
- **Media bleed**: An image that escapes the page fails. A box clipped by an ancestor with overflow other than visible passes.
- **Navigation**: A hamburger elsewhere in the document does not prove the menu collapsed.
- **Menu toggles**: On narrow/touch viewports, toggles must be keyboard-operable and named (`menu-toggle-keyboard`, `menu-toggle-name`).

## Visual Regression Engine

- **Automatic Baseline Setup**: The initial run for any domain/page automatically seeds baseline snapshots.
- **Pixel-level Diffing**: Subsequent runs generate pixel-diff image overlays using `pixelmatch` with configurable change thresholds.
- **Interactive Inspection**: UI allows side-by-side inspection of Baseline, Current, and Diff overlays with one-click baseline promotion.

## API Endpoints

| Route | Purpose |
|---|---|
| `POST /api/runs` | `{domain, sitemap_url?, max_pages}` → `202 {runId}` |
| `GET /api/runs` / `GET /api/runs/:id` | List runs / get detail & progress |
| `GET /api/runs/:id/events` | Server-Sent Events (SSE) live progress stream |
| `POST /api/runs/:id/baseline` | Promote run captures to baseline (`{slug?, viewport?}`) |
| `DELETE /api/runs/:id` | Cancel run & delete artifacts |
| `GET /api/artifacts/:runId/...` | Serve screenshots and diff images |

Environment variables:
- `PORT`: API port (default: 8787)
- `DATA_DIR`: Directory for runs & baselines (default: `server/../data`)
- `PAGE_CONCURRENCY`: Simultaneous captures, page by viewport (default: 4)
- `CRAWL_CONCURRENCY`: Simultaneous discovery fetches (default: 6)
- `ALLOW_PRIVATE=1`: Allow localhost or private IP targets (disabled by default to prevent SSRF)

## Documentation

Detailed documentation is modularized under `docs/`:
- [Architecture & System Design](docs/architecture.md): Subsystems, 7-viewport isolation, storage adapter, and heuristics.
- [Crawler & Top ROI Scoring](docs/crawler-roi.md): Sitemap BFS, headless JS rendering, and high-impact page prioritization.
- [API Reference](docs/api.md): Endpoints, SSE streaming format, health checks, and error schemas.
- [Deployment Guide](docs/deployment.md): Docker Compose, VPS hosting, shared memory requirements, and Caddy/Nginx reverse proxy setups.

## Roadmap & Status

See [TODOS.md](TODOS.md) for detailed task tracking.
- **Phase 1 (Done)**: Core 7-viewport capture engine, heuristics v1, visual diffing, static Vite UI on GitHub Pages.
- **Phase 2 (MVP / Current)**: Local HTML fixtures & Playwright heuristic test suite, SSE progress streaming, false-positive tuning, Docker image, and live VPS deployment (Caddy/Nginx, SSL, health checks).
- **Phase 3 (Tail End)**: Authentication, multi-tenant isolation, database/S3 migration, public shareable reports, and monetisation/paywall.


