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

## Phase 5

- [x] Account API + qaZAR `account.html` for Checkout / current tier (Logi-Ink embeds the same endpoints; see `docs/phase-5-account.md`).
- [x] Postgres driver beside SQLite (`DATABASE_URL`, `FOR UPDATE SKIP LOCKED` claims).
- [x] Multi-worker capture (expired-lease reclaim only; `docker compose --scale worker=N`).
- [x] Hardening: share token UUID gate, metadata host block, billing rate limit, tenant artifact checks, health reports `db`/`storage`.
- [x] Capture speed: drop settle wait, shorter scroll/font budgets for public callers, faster worker idle poll.
- [x] UI: share page, copyable share link on results, PDF link, Account nav.

## Speed

- Baseline, one page of example.com, 7 viewports: discovery 52 ms, capture 6358 ms. Every viewport spent about 500 ms in network idle. Fonts were 0–2 ms.
- After dropping network idle: discovery 54 ms, capture 2574 ms. Idle was 0 ms on every viewport. The second navigation was warm, so part of the drop is cache, and the measured idle wait is gone.

## Phase 5 follow-ons

- [x] Per-owner baseline trees (`baselines/<owner>/<siteHash>/…`) and composite `baseline_meta` key.
- [x] Block literal private-IP / metadata subresources during capture (`navGuard`).
- [x] Pages/anonymous artifact access limited to media (no `run.json`).

## Open follow-ons (this push)

- [x] Finding-review scaffold (`retained` / `needs-review` / `withdrawn`) — see `docs/finding-review.md`. Live calibration on Logia/Logi-Ink still pending.
- [x] Menu-toggle keyboard / accessible-name heuristics (`menu-toggle-keyboard`, `menu-toggle-name`).
- [x] Logi-Ink account page UI + Worker billing proxy.

## Later (not this release)

- [ ] Live precision/recall calibration on Logia and Logi-Ink (apply overrides, publish retained/withdrawn rates).
- [ ] Screenshot-pixel contrast sampler and a fuller accessibility engine beyond DOM heuristics.

Phase 4’s old checklist is [TODOS-PHASE-4.md](TODOS-PHASE-4.md). It points here.
