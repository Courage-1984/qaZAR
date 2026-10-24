---
description: Run the full qaZAR verification suite (unit tests, UI build, e2e smoke).
---

1. Run `npm test` and confirm all tests pass.
2. Run `npm run build:web` and confirm a clean build (no errors).
3. If anything under `server/` changed, follow skill `e2e-smoke` (start the API as a daemon if needed) and report the per-viewport table.
4. Summarise: tests (n/n), build (ok/fail), e2e (status per viewport, violations). Do not claim success without evidence from steps 1–3.
