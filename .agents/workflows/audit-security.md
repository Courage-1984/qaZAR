---
description: Security & SSRF audit workflow across routes, crawler, and git hygiene.
---

1. Verify SSRF protection in `server/routes/validate.js`:
   - Confirm private IP ranges (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1) are strictly rejected unless `ALLOW_PRIVATE=1` is explicitly set.
   - Confirm URL protocol is strictly `http:` or `https:`.
2. Verify git staging hygiene:
   - Check `git status` to ensure `data/`, `.env`, `settings.local.json`, and credentials are never tracked or staged.
3. Check input boundaries:
   - Verify `max_pages` ceiling (max 200).
   - Verify path traversal safety in artifact endpoints: URLs cannot escape `data/runs/<id>`.
4. Review tenant isolation readiness:
   - Confirm new storage operations support `ownerId` scoping and avoid process-global singleton state for user data.
