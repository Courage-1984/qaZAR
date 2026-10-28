Implemented. Live checklist: [TODOS.md](../../TODOS.md).

# Pillar 2 — Durable queue and concurrency

The API never runs Playwright. `POST /api/runs` validates, inserts a `runs` row (`status: queued`), enqueues a `jobs` row, and returns **202**. `npm run worker` claims leased jobs from SQLite (or Postgres) and calls `processRun`.

## Store

`node:sqlite` (`DatabaseSync`) at `data/qazar.sqlite` — WAL, `busy_timeout=5000`. **`better-sqlite3` is not used** (native build cost on Windows/Docker with no durability gain under Node 22).

| Table | Role |
| --- | --- |
| `runs` | `id`, `owner_id`, `share_token`, `status`, `payload` (JSON) |
| `jobs` | leased work: `kind` (`audit` \| `email`), `available_at`, `lease_until`, `attempts`, `worker_id` |

## Claim and recovery

- `claim` is one conditional `UPDATE … RETURNING` (oldest queued ready job).
- Heartbeat every ~¼ lease (default lease 60s).
- `reclaimExpired` returns expired leases to `queued`; after 3 attempts → `failed`.
- `QAZAR_SINGLE_WORKER=1` steals live leases on boot (lone worker).
- `recoverAfterRestart` resets `crawling` / `capturing` runs to `queued` with note `Server restarted — job requeued`, and enqueues a missing audit job so Logi-Ink leads are not stranded.

## Concurrency

- `MAX_CONCURRENT_RUNS` (default **2**, hard cap **16**) — parallel jobs inside one worker process.
- Scale further with `docker compose --scale worker=N` (expired-lease reclaim only across workers).

## Process split

- API: `npm run server` — no `capturePage` import.
- Worker: `npm run worker` — only process that opens Chromium.
