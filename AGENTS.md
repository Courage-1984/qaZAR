# qaZAR – Agent Context

Viewport UI/UX QA + visual regression suite. Node/Express API + Playwright worker; static Vite UI (vanilla JS/CSS) on GitHub Pages. Repo: Courage-1984/qaZAR. Owner intends to **paywall / monetise** it later – keep design multi-tenant-friendly.

## Commands (Windows/PowerShell host; use `;` not `&&`)
- `npm install` · `npx playwright install chromium`
- `npm run server` – API on :8787 (long-running: start as daemon, never block on it)
- `npm run dev:web` / `npm run build:web` – UI (output `web/dist`, deployed by `.github/workflows/pages.yml` on push to `main`)
- `npm test` – node:test, `server/test/*.test.js`
- Verify before every commit: `npm test` + `npm run build:web` (workflow `/verify`).

## Layout
- `server/engine` Playwright capture + `viewports.js` · `server/crawler` sitemap/BFS · `server/heuristics/evaluate.js` DOM checks
- `server/queue/jobQueue.js` run pipeline + cross-viewport checks · `server/visual` baseline + pixelmatch · `server/storage` run persistence
- `server/routes` API + SSRF validation · `web/` UI (index = submit, results = list/detail via `?id=`)
- `data/` runtime output (gitignored): `runs/<id>/`, `baselines/<siteHash>/<slug>/<viewport>.png`

## Invariants (do not break)
1. **7 viewports are exact** (ultrawide 2560x1600, fhd 1920x1080, macbook 1512x982, desktop 1440x900, laptop 1100x700, tablet 768x1024 touch, mobile 390x844 touch). Changing them invalidates all baselines and a unit test enforces it.
2. **`evaluate()` in `heuristics/evaluate.js` is serialized into the browser via `page.evaluate`.** It must be fully self-contained: no imports, no outer-scope references, helpers declared inside. Unit tests only string-check it, so a broken closure fails *at runtime* – always run an e2e smoke (`/verify`).
3. Each page x viewport uses a **fresh BrowserContext**. Never share contexts across captures.
4. **SSRF guard** (`routes/validate.js`) rejects private/loopback targets; `ALLOW_PRIVATE=1` only for local fixture testing. Never weaken it by default.
5. First capture of a page auto-becomes baseline (`status: new`); later runs diff. Promotion is explicit via `POST /api/runs/:id/baseline`.
6. Violation shape: `{rule, severity: error|warn|info, selector, rect, detail}`; rule IDs are stable (UI/trending depend on them); max 50 per rule per viewport.
7. UI is static: API location comes from `localStorage` key `qazar.apiBase` (default `http://localhost:8787`). No server-side rendering, no frameworks, no Tailwind.
8. Never commit `data/`, `.env`, `settings.local.json`, or screenshots of third-party sites.

## Conventions
- ESM only (`"type":"module"`), Node >= 20, no TypeScript, no new dependencies without a reason in the PR/commit.
- UI: accessible (labels, unique ids, >=48px targets), dark premium look, no inline secrets, escape all API strings (`esc()` in `web/api.js`).
- Tests: pure logic gets a unit test; heuristics changes need a fixture or e2e evidence in the summary.
- Commits: imperative, scoped (`heuristics: …`, `ui: …`). Push to `main` is allowed; **never force-push**.
- File caps: code <= 250 lines (evaluate.js <= 400), agentic context <= 150 lines, docs <= 200 lines (`.agents/rules/context-caps.md`).
- Keep this file < 150 lines. Put detail in `.agents/rules/` or skills, not here.

## Roadmap (update when state changes)
- Done: Phase 1 pipeline, heuristics (overflow, touch, typography, contrast, media bleed, collisions, nav collapse), diff UI.
- MVP Phase (Completed):
  - Local HTML fixtures with known violations + Playwright heuristic test suite.
  - Real-time progress in UI via SSE (`GET /api/runs/:id/events`).
  - False-positive tuning: indeterminate contrast, collision expansion, nav-collapse refinement, cross-viewport breakpoint inversion.
  - Docker containerization: production `Dockerfile` with Node 20 + headless Chromium + `docker-compose.yml`.
  - VPS & live deployment (beyond GH Pages): reverse proxy (Caddy/Nginx), SSL, healthcheck (`GET /healthz`), and deployment guide.
  - Robots.txt parser and strict compliance across BFS and sitemaps.
  - High-ROI site profiling, lead intelligence extraction, and executive audit reports with print/PDF engine.
- Tail End (Post-MVP):
  - Auth, API keys, usage limits/quotas, tenant isolation (`ownerId`).
  - DB/S3 storage migration (SQLite/PostgreSQL + Cloudflare R2 / AWS S3).
  - Shareable unguessable public report permalinks.
  - Paywall & payment processing.

## Known weak spots
- Complex CSS pseudo-elements (::before/::after) background compositing can require indeterminate contrast flagging.
- Collision check samples top 60 elements with viewport-intersection filtering.
- Run state is in-memory + JSON files; restart marks in-flight runs `failed`.
- `evaluateCrossViewport` compares `desktop` vs `tablet` and `mobile` across H1/H2 and detects breakpoint style inversions.

## Agent tooling map
Rules: `.agents/rules/` · Skills: `.agents/skills/` (mirrored in `.claude/skills/`) · Workflows: `.agents/workflows/` (`/verify`, `/ship`, `/test-heuristics`, `/audit-security`, `/docker-test`) · Hooks: `hooks.json` → `guard.mjs` (PreToolUse) + `post-tool.mjs` (PostToolUse) · MCP: `mcp_config.json` / `.mcp.json` · Subagents: `.claude/agents/`.

