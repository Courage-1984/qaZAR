# qaZAR TODOs

Live list. Phases 1 and 2 (viewport engine, heuristics, crawler, HTML report, GitHub Pages, tunnel) are done. Detail lives in `docs/`.

## Done

- [x] Seven viewports, self-contained `evaluate()`, SSRF guard, visual diffs.
- [x] SQLite run store (`SqliteRunStore`) and a leased worker (`npm run worker`).
- [x] Partner API keys. GitHub Pages still calls the tunnel with no key.
- [x] Share link `GET /api/share/:token` and A4 PDF (`server/report/pdfReport.js`).
- [x] Crawl-delay on discovery fetches. Public keys capped at `PUBLIC_MAX_PAGES`.
- [x] Logi-Ink `#auditUrl` and `workers/audit-proxy` (separate repo).

## Phase 3 (this release)

- [x] Free vs pro quotas. Pages and `ownerId` `operator` are not capped. Free keys: 5 pages, 1 in-flight run, baselines 14 days. Pro: 50 pages, 3 in-flight runs, baselines 365 days.
- [x] S3-compatible artifacts (`STORAGE_DRIVER=s3`, Cloudflare R2 via `S3_ENDPOINT`). Local disk stays the default.
- [x] Stripe Checkout and webhook. `checkout.session.completed` sets pro. `customer.subscription.deleted` sets free.

## Speed

- Baseline, one page of example.com, 7 viewports: discovery 52 ms, capture 6358 ms. Every viewport spent about 500 ms in network idle. Fonts were 0–2 ms.
- After dropping network idle: discovery 54 ms, capture 2574 ms. Idle was 0 ms on every viewport. The second navigation was warm, so part of the drop is cache, and the measured idle wait is gone.

## Later (not this release)

- [ ] Precision and recall on live Logia and Logi-Ink runs, with retained, withdrawn, and needs-review findings. No replacement score.
- [ ] Screenshot-pixel contrast, full keyboard menu tests, and a maintained accessibility engine.
- [ ] Block private-IP subresources inside the captured page.

## Phase 5 (not started)

- [ ] Logi-Ink account screen for Checkout and the current tier.
- [ ] Postgres driver beside SQLite.
- [ ] More than one capture worker.

Phase 4’s old checklist is [TODOS-PHASE-4.md](TODOS-PHASE-4.md). It points here.
