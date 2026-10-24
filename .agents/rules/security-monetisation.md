---
trigger: model_decision
description: Apply when touching the API, crawler, auth, storage, hosting/deployment, or anything related to accounts, paywall, usage limits, or public report sharing.
---

# Security & monetisation rules

Product direction: public hosted service, later paywalled, possibly rewarding people who fix their sites. Design every change so it can become multi-tenant.

- The crawler fetches arbitrary user URLs → SSRF protection is mandatory (`routes/validate.js`). Re-validate on redirects/new hosts if you add follow-redirect logic; never fetch non-http(s).
- Respect target sites: keep UA `qaZAR/0.1`, bounded concurrency (`PAGE_CONCURRENCY`), timeouts, `max_pages` cap (200). Add robots.txt `Disallow` support before any public launch.
- Never log or persist credentials/cookies of target sites. Authenticated-page testing is out of scope until explicitly planned.
- Keep storage behind small interfaces (`store/runStore.js`, `visual/baseline.js`) so DB/S3 can replace local disk. Don't scatter `fs` calls elsewhere.
- Future-proof for tenants: anything stored per run/baseline should be addable under an `ownerId` namespace; avoid global singletons for user data.
- Secrets only via env vars / `.env` (gitignored). Payment/auth keys never in repo, UI bundle, or run artifacts.
- Public report links (future) must expose only that run's artifacts via unguessable ids; no directory listing.
- Rate-limit and size-limit new endpoints; validate all input at the route boundary.
