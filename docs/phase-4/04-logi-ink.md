# Pillar 4 — Logi-Ink seam

Logi-Ink stays static HTML, vanilla JS, and Vite. No React, Vue, Tailwind, or Express app on that site. The work in this file is specified for the Logi-Ink repo (`c:\Users\Dr0sera\Github\logi-ink`). qaZAR only exposes the key-gated API from pillars 1–3.

## Do not reuse the honeypot

`contact.html` field `#website` (`name="website"`, `tabindex="-1"`, off-screen) is the honeypot. `handleSubmit` in `js/pages/contact.js` rejects a filled honeypot with a generic toast. The audit URL is a **new** field.

- [ ] Add `#auditUrl` (`type="url"`, `name="auditUrl"`, label “Website to audit”, not required).
- [ ] Keep `#website` as the honeypot. Do not rename it and do not post it as the domain.
- [ ] Controls stay at least 48px. No framework classes.

## Worker

Add `workers/audit-proxy/` in the Logi-Ink repo.

Secrets (Worker configuration, never `VITE_`):

- `QAZAR_API_BASE`
- `QAZAR_API_KEY`
- `RECAPTCHA_SECRET`

`VITE_RECAPTCHA_SITE_KEY` stays the public site key. `VITE_AUDIT_PROXY_URL` is the only new public URL, and it is the Worker origin, not qaZAR.

### `POST /audit`

- [ ] Read `FormData`. If `website` is non-empty, return the same generic error the page already shows. Do not call qaZAR.
- [ ] `siteverify` the reCAPTCHA token with `RECAPTCHA_SECRET`. Reject a missing or failed token.
- [ ] If `auditUrl` is set, require `https`. Reject other schemes before calling qaZAR. qaZAR still runs `assertPublicUrl`.
- [ ] `POST ${QAZAR_API_BASE}/api/runs` with `Authorization: Bearer ${QAZAR_API_KEY}` and a **10** second timeout. Body: `{ domain: auditUrl, max_pages: 5, prospectEmail, prospectName, source: 'logi-ink' }`. No `ownerId`, no `renderJs`, no `pages`.
- [ ] Return `{ shareToken }` only. Do not return `runId`.
- [ ] Forward the human message (name, email, phone, subject, message) to the existing Formspree endpoint from the Worker, so one submit still reaches the agency inbox while the audit runs. The browser stops calling Formspree directly once `VITE_AUDIT_PROXY_URL` is set.

### `GET /audit/:shareToken`

- [ ] Proxy to `GET /api/share/:token` on qaZAR using the bearer key (the share route itself is unauthenticated; the Worker still hides the API host).
- [ ] `Access-Control-Allow-Origin: https://logi-ink.co.za` only, plus the local preview origin when `ENVIRONMENT` is not production. No `*`.

## Page behaviour

In `js/pages/contact.js` `submitForm()`:

- [ ] When `import.meta.env.VITE_AUDIT_PROXY_URL` is set, `POST` the form there. Otherwise keep today's Formspree call so local dev without a Worker still works.
- [ ] Keep the existing spinner, disabled submit button, and `showToast`.
- [ ] On success, if `auditUrl` was set, write into a new `#auditStatus` region (`aria-live="polite"`) and call `pollAudit(token)`.
- [ ] `pollAudit` uses `fetch` every **2** seconds. Stop on `done`, `failed`, or after **5** minutes. Update the status text only. Do not open an `EventSource` to qaZAR. An SSE relay through the Worker is a later phase; Worker CPU limits make polling the shippable path.
- [ ] The network panel for a production submit shows the Worker origin only.

## Checks

- [ ] Logi-Ink unit or e2e test: honeypot filled → no proxy call; `auditUrl` of `http://` → Worker rejects; success path with a mocked Worker renders `#auditStatus`.
- [ ] Confirm the built JS bundle contains no `QAZAR_API_KEY` string and no qaZAR host.
- [ ] Manual: public `https` URL from `contact.html`. Prospect and `AGENCY_INBOX` each receive one PDF (pillar 3). `GET /api/runs` without a key is 401.
