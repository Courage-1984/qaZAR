# Deployment & Hosting Guide

qaZAR consists of:
1. **API & Browser Engine**: Node.js + Playwright Chromium (runs in Docker, systemd, or on a VPS).
2. **Web UI**: Static vanilla JS/CSS client (hosted on GitHub Pages, Cloudflare Pages, or reverse-proxied with the API).

---

## 1. Docker & Docker Compose (Recommended)

### Prerequisites
- Docker & Docker Compose installed on the host.

### Production Compose Run
```bash
docker compose up -d
# Multiple capture workers (shared DATA_DIR or DATABASE_URL):
docker compose up -d --scale worker=3
```
> [!IMPORTANT]
> Playwright headless browser rendering across 7 viewports (including ultrawide 2560x1600) requires adequate shared memory. `docker-compose.yml` pre-configures `shm_size: '1gb'`.

Verify the service is operational:
```bash
curl http://localhost:8787/healthz
# Expect ok, db (sqlite|postgres), storage (local|s3)
```

---

## 2. Reverse Proxy & SSL (Caddy / Nginx)

When deploying to a public VPS (Oracle Cloud, Hetzner, DigitalOcean), place Caddy or Nginx in front of the API.

### Caddyfile Example (Automatic HTTPS)
```caddyfile
qazar-api.example.com {
    reverse_proxy localhost:8787 {
        # Required for Server-Sent Events (SSE) streaming
        flush_interval -1
    }
}
```

### Nginx Example
```nginx
server {
    server_name qazar-api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;

        # Disable response buffering for Server-Sent Events (SSE)
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

---

## 3. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | API server listen port |
| `DATA_DIR` | `./data` | Directory for runs, baselines, and diffs |
| `DATABASE_URL` | empty | Postgres URL; omit to keep SQLite |
| `STORAGE_DRIVER` | `local` | `s3` selects S3/R2 artifacts |
| `PAGE_CONCURRENCY` | `4` | Simultaneous captures (page × viewport) per run |
| `PUBLIC_PAGE_CONCURRENCY` | `6` | Capture concurrency for public/partner keys |
| `CRAWL_CONCURRENCY` | `6` | Simultaneous discovery fetches |
| `ALLOW_PRIVATE` | `0` | Set `1` only in local fixture testing |
| `QAZAR_API_KEYS` | empty | Partner keys: `keyId.secret.ownerId`. The Pages tunnel stays usable without one |
| `PUBLIC_MAX_PAGES` | `5` | Page cap for a non-operator key |
| `QAZAR_SINGLE_WORKER` | unset | Set `1` only when a lone worker should reclaim all leased jobs on boot |
| `MAIL_PROVIDER` | `resend` | `resend` or `postmark` |
| `MAIL_API_KEY` / `MAIL_FROM` / `AGENCY_INBOX` | empty | PDF mail. Unset mail is skipped when there is no prospect |
| `STRIPE_*` | empty | Billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |

The API process does not run Playwright. Start `npm run worker` (or scale the `worker` service) beside `npm run server`. See [phase-5-account.md](phase-5-account.md). Set `NO_TUNNEL=1` when you do not want a public URL. `npm run server:tunnel` passes `--tunnel`, which forces the tunnel even when `NO_TUNNEL=1`.

Copy `.env.example` to `.env`. The API and capture worker load that file on boot and do not override variables already set in the environment. Compose reads the same names.

## 4. Logi-Ink partner

| Variable | Default | Purpose |
|---|---|---|
| `LOGI_INK_API_SECRET` | empty | Shared with the Logi-Ink Worker (`x-api-key`). When set, anonymous `POST /api/runs` is 401 except from `*.github.io` |
| `LOGI_INK_OWNER_ID` | `logi-ink` | Tenant id for partner runs |
| `LOGI_INK_OWNER_EMAIL` | `AGENCY_INBOX` | Inbox for the internal PDF |
| `QAZAR_PUBLIC_BASE` | empty | Public API origin used in mailed links |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Logi-Ink contact page | Checkout return URLs |

Mail still needs `MAIL_API_KEY` and `MAIL_FROM` (or `SMTP_HOST`). Checkout still needs `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`. Leave those empty until the provider keys exist. The Worker calls this API at `QAZAR_API_BASE`; a quick tunnel URL changes every time the API process restarts.
