---
name: e2e-smoke
description: Run a real end-to-end qaZAR smoke test (API + Playwright + diff) against a URL and report per-viewport status and violations. Use after changing server/, heuristics, capture, or visual diff code.
---

# E2E smoke test (PowerShell)

1. Check the API: `Invoke-RestMethod http://localhost:8787/api/health`. If down, start `npm run server` **as a daemon** (do not block on it). Chromium must be installed (`npx playwright install chromium`).
2. Submit twice (run 1 creates baselines → `new`; run 2 should be `unchanged`, diff 0%):
   ```powershell
   $h=@{'Content-Type'='application/json'}
   $r=Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/runs -Headers $h -Body '{"domain":"https://example.com","max_pages":1}'
   ```
3. Poll `GET /api/runs/<id>` every ~3s until `status` is `done` or `failed` (cap ~2 min). Don't busy-loop with the task tool; use bounded loops.
4. Report a table: viewport → status, diffPercent, violation count (+ rule ids). Any `error` status or `failed` run is a regression.
5. Negative check: POST `{"domain":"http://localhost:1"}` must return 400 (SSRF guard).
6. Use `ALLOW_PRIVATE=1` only when intentionally testing local fixtures; unset it afterwards.
