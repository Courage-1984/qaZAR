# Pillar 2 — Durable queue and concurrency

`server/queue/jobQueue.js` keeps one run on `let chain = Promise.resolve()`. `enqueue` appends `processRun`. A restart in `loadAll()` marks `queued`, `crawling`, and `capturing` as `failed`. That is not safe once a stranger can submit work.

`parseRobotsTxt()` in `server/crawler/robots.js` returns `crawlDelay`. `loadRobots()` in `server/crawler/crawl.js` keeps only `disallows` and `allows`.

## Queue store

| Option | Fit | Decision |
| --- | --- | --- |
| `node:sqlite` (`DatabaseSync`) | One file on the existing `DATA_DIR` volume. No extra service. Claim is a conditional `UPDATE`. Matches the no-new-dependency rule. | **Chosen** |
| BullMQ plus Redis | Better when several worker hosts compete. Adds a second process, a new dependency, and an auth surface that does not exist yet. | Rejected this phase |
| `better-sqlite3` | Same SQL, but a native build on Windows and in the image. | Rejected |

- [ ] Bump `engines.node` in `package.json` from `>=20` to `>=22`. CI and Pages already use Node 22.
- [ ] Add `server/storage/sqliteDb.js`. Open `data/qazar.sqlite` with WAL and `busy_timeout = 5000`.
- [ ] Table `runs`: `id`, `owner_id`, `share_token`, `status`, `payload` (JSON text), `lease_until`.
- [ ] Table `jobs`: `id`, `run_id`, `kind` (`audit` or `email`), `status`, `available_at`, `lease_until`, `attempts`, `last_error`, `worker_id`.
- [ ] `data/qazar.sqlite` stays under `data/` and is gitignored with the rest of that directory.

## Claim API

Add `server/queue/sqliteQueue.js`:

- [ ] `enqueue(runId, kind)` inserts a `queued` job with `available_at` of now.
- [ ] `claim(workerId, leaseMs)` updates the oldest `queued` row whose `available_at` has passed. The worker won only when `changes === 1`. Two workers must not receive the same id.
- [ ] `heartbeat(jobId)` extends `lease_until`.
- [ ] `complete(jobId)` and `fail(jobId, err)`.
- [ ] `reclaimExpired()` sets `leased` rows with `lease_until` in the past back to `queued` and increments `attempts`. At **3** attempts, status becomes `failed`.

`claim` is one statement, not a `SELECT` followed by an `UPDATE`.

## Process split

- [ ] Add `server/worker.js`. It is the only process that imports `capturePage` or `getBrowser`.
- [ ] Move the `processRun` body out of the API process into a module the worker calls (`server/queue/processRun.js`, still under 250 lines; split viewport work if it would exceed that).
- [ ] Worker loop: `reclaimExpired()`, `claim`, set the run `crawling` then `capturing`, heartbeat every **15** seconds, lease **60** seconds. On start, do **not** mark leased jobs failed.
- [ ] Delete the in-memory `chain` in `jobQueue.js`. `server/index.js` inserts the run and the job, returns **202**, and does not run Playwright.
- [ ] `package.json` script `worker`: `node server/worker.js`. `server` stays the API.
- [ ] `docker-compose.yml`: services `api` and `worker`, same image, shared `./data` volume. The worker keeps `shm_size: 1gb`. The API healthcheck stays `GET /healthz`.

`loadAll()` must stop rewriting in-flight runs to `failed`. Recovery is `reclaimExpired()` only.

## Crawl-delay and per-host limits

- [ ] Add `server/crawler/hostGate.js` with `waitForHost(origin, robotsDelaySec)`.
- [ ] One mutex per origin. The gap is `max(robotsDelaySec, HOST_GAP_SEC)` seconds. `HOST_GAP_SEC` defaults to **1**. Cap at `HOST_GAP_CAP_SEC` default **10**, so `Crawl-delay: 86400` cannot stall the worker.
- [ ] In-flight cap `HOST_INFLIGHT` default **2** for that origin.
- [ ] Call `waitForHost` from `bfs` before `fetchPublic`, and from `capturePage` before `page.goto`.
- [ ] `loadRobots()` returns `crawlDelay` on `robotRules`. `buildQueue` stores it on the run for the gate. Allow-beats-Disallow stays as it is.
- [ ] A public run uses crawl concurrency **2** even when `CRAWL_CONCURRENCY` is 6 for the operator.

Capture contexts still download images. The image/font/media block stays on headless link discovery only.

## Tests

`server/test/queue.test.js` and `server/test/hostGate.test.js`:

- [ ] Two overlapping `claim` calls return different job ids, or one of them gets nothing.
- [ ] An expired lease returns to `queued` with `attempts` increased. It is not `failed` until the third reclaim.
- [ ] `crawlDelay` of 2 waits at least 2 seconds. A delay of 100 is capped at 10 seconds.
- [ ] A simulated restart does not set `failed` before attempts are exhausted.
