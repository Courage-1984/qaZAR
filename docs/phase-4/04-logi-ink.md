Implemented. Live checklist: [TODOS.md](../../TODOS.md).

# Pillar 4 — Logi-Ink seam

Logi-Ink stays static HTML, vanilla JS, and Vite. The Worker lives in the Logi-Ink repo (`workers/audit-proxy`). qaZAR gates partner posts with `x-api-key: LOGI_INK_API_SECRET`.

## Auth (qaZAR)

- `LOGI_INK_API_SECRET` — Worker sends `x-api-key`. Sets `ownerId` to `LOGI_INK_OWNER_ID` (default `logi-ink`).
- When the secret is set, anonymous `POST /api/runs` is 401; partner key, bearer `QAZAR_API_KEYS`, or operator cookie still pass.
- `LOGI_INK_OWNER_EMAIL` — Dennis James Webster inbox for internal PDF + follow-up (falls back to `AGENCY_INBOX`).
- Mail: `server/report/mailer.js` (Logi-Ink HTML) + Resend/Postmark, or optional SMTP via `nodemailer` when `SMTP_HOST` is set.

## Worker (`workers/audit-proxy`)

Secrets (never `VITE_`): `QAZAR_API_BASE`, `LOGI_INK_API_SECRET` (or legacy `QAZAR_API_KEY`), `RECAPTCHA_SECRET`.

- `POST /audit` — honeypot `website`, reCAPTCHA, https-only `auditUrl`, then `POST /api/runs` with `x-api-key`. Returns `{ shareToken }` only.
- `GET /audit/:shareToken` — proxies share JSON. CORS locked to `https://logi-ink.co.za` (+ localhost off production).

## Page (`js/pages/contact.js`)

- `#auditUrl` is the audit field; `#website` stays the honeypot.
- When `VITE_AUDIT_PROXY_URL` is set, submit goes to the Worker; else Formspree.
- `#auditStatus` shows crawl / capture / done copy and polls every 2s for up to 5 minutes.
