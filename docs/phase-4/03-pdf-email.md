# Pillar 3 — Server-side PDF and email

`generateExecutiveReport(run, leadEmail, options)` in `server/report/reportGenerator.js` returns HTML. `GET /api/runs/:id/report?email=` only changes the `mailto:` recipient. Nothing sends mail when a run finishes.

The worker runs this pillar. The API process does not import `renderReportPdf` or `getBrowser`.

## Mail transport

| Option | Fit | Decision |
| --- | --- | --- |
| Resend or Postmark via `fetch` | Secret in env. No new dependency. Works from the VPS. | **Chosen.** `MAIL_PROVIDER=resend` or `postmark`, plus `MAIL_API_KEY`, `MAIL_FROM`, `AGENCY_INBOX`. |
| `nodemailer` | Right only if the agency already has an SMTP relay. Extra dependency. | Not this phase |

`sendReport` keeps the shape `{ to, subject, text, html, attachments }` so an SMTP body can replace the `fetch` later without a route change.

## PDF

- [ ] Add `server/report/renderPdf.js` with `renderReportPdf(html)`.
- [ ] New context from `getBrowser()` (worker only). `page.emulateMedia({ media: 'print' })` so `server/report/reportStyles.js` print rules apply.
- [ ] `page.setContent(html, { waitUntil: 'load' })`, then `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`.
- [ ] Close the context in `finally`. One context per PDF. Do not share it with a capture.
- [ ] `storage.writeArtifact(run.id, 'report.pdf', buffer)`.
- [ ] Build the HTML with `generateExecutiveReport`. The agency address inside the HTML `mailto:` is `AGENCY_INBOX`, not `req.query.email`.

Chromium is already the Playwright browser. `page.pdf` is Chromium-only, which matches `capturePage`.

## Recipients

- [ ] Agency inbox is `AGENCY_INBOX`. Never `req.query.email`.
- [ ] Prospect address is `run.input.prospectEmail`, set only by the authenticated create path after a syntax check (one `@`, no spaces, length under 254).
- [ ] `GET /api/runs/:id/report?email=` may still change the operator HTML view. Share-token PDF downloads ignore that query.

## Dispatch

- [ ] Add `server/mail/sendReport.js` with `sendReport({ run, pdf })`.
- [ ] Two messages. Agency: PDF, score, domain, and the share path. Prospect: PDF and a short note. The prospect body does not include scraped emails, phones, or booking links.
- [ ] From `MAIL_FROM`. Reply-To `AGENCY_INBOX`.
- [ ] Resend: `POST https://api.resend.com/emails` with `Authorization: Bearer ${MAIL_API_KEY}`. Postmark: `POST https://api.postmarkapp.com/email` with header `X-Postmark-Server-Token`. Pick from `MAIL_PROVIDER`. Attachment is the PDF bytes as base64.

## Worker order

After captures succeed:

1. `summarize(run)`.
2. Status `done` (the audit succeeded even if mail later fails).
3. `renderReportPdf`.
4. `sendReport`.

- [ ] On mail failure, set `emailError` and leave status `done`. Enqueue a `kind: 'email'` job. Backoff **1** minute, then **5**, then **15**. Do not recrawl. Do not re-render the PDF if `report.pdf` is already on disk.
- [ ] After three mail attempts, leave `emailError` and stop. The operator can see it on the run. The prospect is not given a stack trace.

## Tests

- [ ] `server/test/mail.test.js` stubs `fetch`. Assert both recipients, that the prospect payload has no `leadContacts` values, and that `Reply-To` is `AGENCY_INBOX`.
- [ ] Assert `server/index.js` does not import `renderReportPdf` or `sendReport` (read the source in the test).
- [ ] A full `page.pdf` call is optional in CI. Do not add a new browser dependency to the default `npm test` if the existing heuristic tests already launch Chromium; a small HTML fixture PDF test is allowed only if it stays inside the current Playwright install.
