---
name: ship-and-deploy
description: Commit, push to main and verify the GitHub Pages deployment of the qaZAR UI. Use when the user asks to commit/push/deploy or after a verified change is ready.
---

# Ship & deploy

1. Run workflow `/verify` first; stop if anything fails.
2. `git status` – confirm no `data/`, `.env`, `settings.local.json`, or screenshots are staged.
3. Commit (imperative, scoped) and `git push` to `main`. Never force-push; never `--no-verify`.
4. Deployment is automatic (`.github/workflows/pages.yml`: `npm ci` → `npm run build:web` → publish `web/dist`). Check: `gh run list -R Courage-1984/qaZAR -L 1` until `completed success` (≈30s). Don't poll in a tight loop.
5. Confirm https://courage-1984.github.io/qaZAR/ returns 200.
6. If it failed: `gh run view --log-failed`, fix, push again. Pages must already be enabled (`build_type: workflow`).
7. Update `AGENTS.md` Roadmap/Known weak spots if project state changed.
