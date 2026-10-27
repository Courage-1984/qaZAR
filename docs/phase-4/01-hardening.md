# Pillar 1 — Infrastructure and security

Close the open API before any public form can call it. SSRF in `assertPublicUrl` stays as it is. Do not weaken it.

## Holes

- `server/index.js` calls `startPublicTunnel` and `publishDiscovery` on boot. `server/tunnel.js` writes gist `524347c4e86d2457bcb527dc8249e95e`. `server/config.js` turns the tunnel on unless `NO_TUNNEL=1`.
- `server/storage/databaseAdapter.js` `create()` builds ids as a timestamp plus `crypto.randomBytes(3)`. `ownerId` defaults to `'default'`. `server/routes/runs.js` never passes `ownerId`, so `get`, `list`, and `delete` do not isolate tenants.
- `server/index.js` mounts `cors()` with no origin list and `express.static` on `data/runs`.

## API keys

- [ ] Add `server/auth/apiKey.js` with `loadApiKeys()` and `requireApiKey(req, res, next)`.
- [ ] Env `QAZAR_API_KEYS` is a comma-separated list of `keyId.secret.ownerId`.
- [ ] Read `Authorization: Bearer <secret>`. Compare with `crypto.timingSafeEqual` against a same-length buffer. Missing or unknown key returns **401**. Do not log the secret.
- [ ] Attach `req.auth = { keyId, ownerId }`.
- [ ] Apply `requireApiKey` to every route in `server/routes/runs.js`.
- [ ] `createRun(input, { ownerId: req.auth.ownerId })`. Ignore any `ownerId` in the JSON body.
- [ ] A key whose `ownerId` is `operator` is the operator key. Every other key is a **public** caller (Logi-Ink).

## Identifiers and share links

- [ ] Replace the id in `JsonDatabaseAdapter.create` with `crypto.randomUUID()`.
- [ ] Add `shareToken` (`crypto.randomUUID()`) on the run. The authenticated `POST /api/runs` response returns `{ runId, shareToken }`. The browser-facing Worker returns only `shareToken`.
- [ ] Add `server/routes/share.js`, mounted at `GET /api/share/:token`. Resolve by `shareToken`, not by run id.
- [ ] Response shape is `{ status, progress, score, grade, domain }` only. No `leadContacts`, no screenshot paths, no prospect email.
- [ ] `GET /api/share/:token/report.pdf` streams the PDF after it exists. Until then, **404**.
- [ ] Unknown token and a token that does not exist use the same 404 body. No extra field that distinguishes them.

## Artefacts, CORS, and limits

- [ ] Remove `express.static` on `data/runs`. Replace it with a handler that checks the API key, loads the run, and allows the read only when `run.ownerId === req.auth.ownerId`, then `storage.readArtifact`. Another owner's file is **404**.
- [ ] `GET /healthz` and `GET /api/health` stay public. Drop `tunnel` from that JSON.
- [ ] `express.json({ limit: '16kb' })` in `server/index.js`.
- [ ] `cors({ origin: config.allowedOrigins })`. `QAZAR_ALLOWED_ORIGINS` is the Logi-Ink origin plus the Worker origin. An empty list means no browser CORS.
- [ ] Add `express-rate-limit` (the only new dependency this phase). On `POST /api/runs`: **30** requests / 15 minutes per API key, and **10** / 15 minutes per IP. `standardHeaders: true`, `legacyHeaders: false`.
- [ ] On `GET /api/share/:token`: **60** / minute per IP.

## Public caller limits

In `validateRunInput` (`server/routes/validate.js`):

- [ ] A public caller cannot set `renderJs` and cannot pass `pages`.
- [ ] `max_pages` is `min(requested, config.publicMaxPages)`. `PUBLIC_MAX_PAGES` defaults to **5**.
- [ ] The operator key keeps the existing cap of **200** (`config.maxPagesCap`).
- [ ] `assertPublicUrl` is unchanged, including redirect re-checks.

## Tunnel and gist

GitHub Pages stays on the public tunnel. A cookie set on the tunnel host is not sent from `github.io`, and the key must not live in the Pages bundle, so the console keeps calling the API with no bearer token. Partner calls send a key and are scoped to that `ownerId`.

- [x] Tunnel stays on unless `NO_TUNNEL=1` or `QAZAR_TUNNEL=0`. `publishDiscovery()` still updates the gist so Pages can auto-detect the API.
- [x] Boot still prints the GitHub Pages `?api=` link.

## Operator console

The GitHub Pages UI must stop discovering the API. A key in the Pages bundle would be public.

- [ ] `POST /api/operator/session` accepts `QAZAR_OPERATOR_KEY` and sets an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
- [ ] The static UI served by Express sends that cookie. `requireApiKey` accepts the cookie as well as the bearer header.
- [ ] `web/api.js`: remove gist discovery (`GIST_API`, `GIST_RAW`, `autoDiscoverApi` as the product path). Document the change in `docs/deployment.md` and `docs/api.md`.

## Tests

`server/test/auth.test.js`:

- [ ] Bad or missing key → 401.
- [ ] Body `ownerId` is ignored; the stored owner is the key's owner.
- [ ] Public key cannot set `max_pages` above 5, `renderJs`, or `pages`.
- [ ] Share payload has no `leadContacts` and no screenshot path.
- [ ] Artefact read for another owner → 404.
- [ ] `GET /healthz` has no `tunnel` field.
