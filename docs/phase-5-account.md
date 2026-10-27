# Phase 5 — Account, Postgres, multi-worker

## Logi-Ink Checkout / tier UI

qaZAR exposes key-gated billing for the Logi-Ink account screen (separate repo):

| Method | Path | Auth | Body / response |
|---|---|---|---|
| `GET` | `/api/billing/account` | Bearer partner key | `{ ownerId, tier, pageCap, inflight, baselineDays, checkout }` |
| `POST` | `/api/billing/checkout` | Bearer partner key | `{ url }` Stripe Checkout session |
| `POST` | `/api/billing/webhook` | Stripe signature | updates `owners.tier` |

Logi-Ink should call these through its Worker (same pattern as `/audit`), never embed `STRIPE_SECRET_KEY` or `QAZAR_API_KEY` in the static site. The Worker exposes `GET /billing/account` and `POST /billing/checkout`. The qaZAR `web/account.html` page is the reference UI.

Public share status for prospects: `GET /api/share/:token` and UI `share.html?token=…`.

## Postgres beside SQLite

- Default: SQLite file under `DATA_DIR/qazar.sqlite`.
- Set `DATABASE_URL=postgres://…` to use the Postgres driver (`server/storage/postgresDb.js` + `server/queue/postgresQueue.js`).
- Claim uses `FOR UPDATE SKIP LOCKED` so multiple workers share one queue safely.

## Multi-worker capture

- Workers only reclaim **expired** leases on boot (set `QAZAR_SINGLE_WORKER=1` to reclaim all leased rows on a lone worker restart).
- Run several processes: `npm run worker` in each, or `docker compose up -d --scale worker=3`.
- Tune `PAGE_CONCURRENCY`, `PUBLIC_PAGE_CONCURRENCY`, `WORKER_IDLE_MS`, `WORKER_LEASE_MS`.

## Baselines

Files live at `baselines/<ownerId>/<siteHash>/<slug>/<viewport>.png`. Meta rows use primary key `(owner_id, site_hash)` so prune cannot delete another tenant’s tree.

## Security notes (intentional Pages seam)

GitHub Pages still calls the public tunnel **without** a bearer key and is treated as `ownerId=operator`. Partner keys are always tenant-scoped. Unauthenticated artifact GETs are limited to media (`.png`/`.pdf`/…); `run.json` stays private. Prefer Compose secrets / a restricted env file for `QAZAR_API_KEYS` and `STRIPE_*` in production.
