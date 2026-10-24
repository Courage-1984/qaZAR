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

### 7. False-Positive Tuning & Heuristic Robustness (Completed)
- [x] Flag contrast over background images, linear gradients, or video backgrounds as `wcag-contrast-indeterminate` with `severity: 'info'`.
- [x] Expanded collision detection sampling to top 60 interactive/content elements with viewport-intersection filtering.
- [x] Refined `nav-collapse` selector heuristics with bypass for scrollable chip/tag carousels.
- [x] Expanded cross-viewport scaling heuristics covering H1 and H2 scale down checks + mobile undersized warnings.

### 8. Crawl Intelligence, Cheap ROI State & Hot Lead Capture (Completed)
- [x] Zero-overhead page profiling during crawl (`server/crawler/siteProfiler.js`): TTFB response time, HTML byte size, viewport meta detection, tech stack fingerprinting (WordPress, Shopify, Webflow, Next.js, React, Nuxt, jQuery, GTM, Meta Pixel).
- [x] Non-invasive lead contact scraping: public email, phone, and social profile discovery.
- [x] Executive UX/UI Audit Report HTML generator (`server/report/reportGenerator.js`): standalone, print-ready, high-trust 0-100 score + letter grade with remediation quote lead capture CTA.
- [x] Integrated Crawl & Lead Intelligence badge strip in `web/results.js` (latency, tech stack, mobile viewport check, lead email).
- [x] Unit test suite for site profiler and lead signal aggregation in `server/test/unit.test.js`.

### 9. Crawler & Report Iteration with MVP Progress Markers (Completed)
- [x] Granular crawl progress markers streamed over SSE (`crawling:sitemap`, `crawling:bfs`, `crawling:profiling`, `crawling:prioritizing`).
- [x] Expose ROI score breakdown and commercial weight factors in UI run view (page tags e.g. `pricing · 95pts`).
- [x] Exportable JSON summary (`?format=json`) and customizable lead capture agency email (`?email=`) in report generator.
- [x] Automatic stale process detection and auto-termination on port 8787 upon server start (`server/freePort.js`).

### 10. High-ROI Report Intelligence & Noise Elimination (Completed)
- [x] Cross-viewport defect clustering (`server/report/scoreCalculator.js`) to eliminate repetition, duplicate noise, and report inflation.
- [x] Zero-overhead transport security (HTTPS, HSTS, CSP) and asset compression (Gzip/Brotli) profiling (`server/crawler/siteProfiler.js`).
- [x] Engineering Remediation vs. Rebuild ROI Calculator (`estimateRemediationRoi`) in executive reports and lead capture emails.

### 11. Conversion Funnel Integrity & Print-Ready Export (Completed)
- [x] Conversion funnel classification (`siteProfiler.js`): tracks pricing, checkout, auth, and contact coverage.
- [x] Zero-cost broken link detection during BFS and sitemap discovery.
- [x] Print & PDF export engine in `reportGenerator.js` with page-break protection and one-click print button.

### 12. Anti-Inflation Calibration & Authentic Reporting (Completed)
- [x] Selector normalization in `clusterDefects`: collapses sibling elements (e.g. repeated navigation/footer items) into a single component finding to prevent artificial defect multiplication.
- [x] Scope-calibrated dev effort estimator: realistically scales hours based on actual site page count and clean architecture (e.g. 1-page sites with minor issues receive 1-2h polish, not 8h-15h inflation).
- [x] Suppressed 0-count risk items in executive reports: non-existent liabilities are replaced with positive structural health confirmations.

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
