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

- **Touch Targets (Mobile/Tablet)**: Any `<button>`, `<a>`, or interactive control smaller than 48×48px on `touch: true` viewports.
- **Responsive Breakage**: Detects horizontal scrolling (`scrollWidth > clientWidth`), unclipped layout offenders, and masked overflow.
- **Typography Scaling**:
  - Base body text dropping below 16px and median rendered text size.
  - Heading hierarchy checks (`h1 >= h2 >= h3`).
  - Cross-viewport scaling (flags static heading sizes on mobile or headings undersized relative to body text).
- **Contrast Ratios (WCAG AA)**: Computes relative luminance and alpha-composited backgrounds. Flags contrast ratios below 4.5:1 (or 3:1 for large text).
- **Element Collisions & Overlaps**: Computes bounding box intersections between non-nested text/button layout elements in the same flow plane.
- **Media Bleed**: Flags images, videos, canvas, or iframes overflowing viewport or parent containers lacking responsive max-width rules.
- **Standard Navigation Collapse**: Checks that multi-link desktop navigations collapse or provide a standard responsive toggle/hamburger menu on tablet/mobile viewports.

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
- `PAGE_CONCURRENCY`: Parallel page processing (default: 2)
- `ALLOW_PRIVATE=1`: Allow localhost or private IP targets (disabled by default to prevent SSRF)
