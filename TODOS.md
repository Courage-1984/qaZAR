# qaZAR – Project Roadmap & TODOs

This file tracks active engineering tasks and milestones across the qaZAR development lifecycle.

---

## Phase 1: Core Engine & Heuristics (Completed)
- [x] Multi-viewport capture engine (7 exact viewports: ultrawide, fhd, macbook, desktop, laptop, tablet, mobile).
- [x] DOM heuristic checks (`server/heuristics/evaluate.js`):
  - [x] Responsive breakage & horizontal overflow (`overflow-x`).
  - [x] Touch target minimums (>= 48x48px on mobile/tablet).
  - [x] Typography scaling (minimum body size, heading hierarchy).
  - [x] WCAG AA contrast ratio calculation (luminance + alpha compositing).
  - [x] Media bleed & unconstrained media containers.
  - [x] Layout collisions and element overlap detection.
  - [x] Responsive navigation collapse checks.
- [x] Visual regression suite with `pixelmatch` diff generation.
- [x] First-run automatic baseline seeding & manual promotion (`POST /api/runs/:id/baseline`).
- [x] Static Vite UI (vanilla JS/CSS) with 3-way visual inspector (baseline / diff / current).
- [x] Initial crawler (sitemap XML parser & BFS crawler with SSRF guard).
- [x] Shared safety hooks and agentic governance (`AGENTS.md`, `.agents/`).

---

## Phase 2: MVP Completion & Production Readiness (Completed / Active)

### 1. Local HTML Fixtures & Automated Heuristic Tests (Completed)
- [x] Created synthetic test fixture HTML files under `server/test/fixtures/` (`clean.html`, `overflow.html`, `touch.html`, `contrast.html`).
- [x] Added Playwright-backed test suite (`server/test/heuristics.test.js`) validating `evaluate()` runtime closures against live headless Chromium contexts.

### 2. Real-Time UI Progress (SSE) (Completed)
- [x] Implemented Server-Sent Events endpoint `GET /api/runs/:id/events` with heartbeat ping keep-alives and proxy compatibility headers.
- [x] Upgraded `web/results.js` to connect to `EventSource` for live per-viewport progress and violation updates with polling fallback.

### 3. Smart Crawler & ROI Prioritization (Completed)
- [x] Created ROI Page Scorer (`server/crawler/roiScorer.js`) prioritizing commercial & core UX templates over pagination/duplicate content.
- [x] Added Headless JS Crawl fallback (`server/crawler/headlessCrawl.js`) for Single Page Applications (SPAs).

### 4. Storage & Database Abstraction (Completed)
- [x] Created `storageAdapter.js` abstracting run artifacts, diffs, and baselines for local filesystem and future S3/R2.
- [x] Created `databaseAdapter.js` supporting multi-tenant `ownerId` and SSE broadcasting.
- [x] Consolidated storage layer in `server/storage/runStore.js`.

### 5. Docker Containerization & Health (Completed)
- [x] Production `Dockerfile` with Node 20 base + Playwright headless Chromium dependencies.
- [x] `docker-compose.yml` pre-configuring `shm_size: '1gb'` and persistent volume mapping.
- [x] Healthcheck endpoints `GET /healthz` and `GET /api/health` with memory, uptime, and queue metrics.

### 6. Live VPS Deployment & Documentation (Completed)
- [x] Added deployment guide (`docs/deployment.md`) with Caddy and Nginx reverse proxy configurations with automatic SSL.
- [x] Modular documentation suite under `docs/` (`architecture.md`, `crawler-roi.md`, `api.md`, `deployment.md`).

### 7. False-Positive Tuning (In Progress)
- [ ] Flag contrast over background images, linear gradients, or video backgrounds as `indeterminate` rather than silently skipping.
- [ ] Optimize collision algorithm to sample beyond the top ~35 elements safely.
- [ ] Refine `nav-collapse` selector heuristics to support custom hamburger toggle components.
- [ ] Expand cross-viewport scaling heuristics beyond desktop vs. mobile H1 comparison.

---

## Phase 3: Tail End – Auth, Multi-Tenancy & Monetisation (Post-MVP)

### 1. Authentication & Tenant Isolation
- [ ] User authentication (session tokens / API keys).
- [ ] Enforce tenant boundaries using the built-in `ownerId` in `server/storage/databaseAdapter.js`.
- [ ] Strict tenant isolation: users can only inspect or delete their own runs.

### 2. Cloud Storage Migration
- [ ] Add S3/Cloudflare R2 driver to `server/storage/storageAdapter.js`.
- [ ] Add SQLite / PostgreSQL driver to `server/storage/databaseAdapter.js`.

### 3. Public Sharing & Reporting
- [ ] Shareable report permalinks: unguessable public tokens granting read-only access to a specific run report.
- [ ] Exportable PDF / summary reports for client handoff.

### 4. Monetisation & Usage Quotas
- [ ] Free vs. Pro tier enforcement (page limits, concurrent runs, baseline retention).
- [ ] Stripe / LemonSqueezy billing integration.
