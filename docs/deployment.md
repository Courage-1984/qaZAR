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
```
> [!IMPORTANT]
> Playwright headless browser rendering across 7 viewports (including ultrawide 2560x1600) requires adequate shared memory. `docker-compose.yml` pre-configures `shm_size: '1gb'`.

Verify the service is operational:
```bash
curl http://localhost:8787/healthz
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
| `PAGE_CONCURRENCY` | `4` | Simultaneous captures (page × viewport) per run |
| `CRAWL_CONCURRENCY` | `6` | Simultaneous discovery fetches |
| `ALLOW_PRIVATE` | `0` | Set `1` only in local fixture testing |
| `QAZAR_API_KEYS` | empty | Partner keys: `keyId.secret.ownerId`. The Pages tunnel stays usable without one |
| `PUBLIC_MAX_PAGES` | `5` | Page cap for a non-operator key |
| `MAIL_PROVIDER` | `resend` | `resend` or `postmark` |
| `MAIL_API_KEY` / `MAIL_FROM` / `AGENCY_INBOX` | empty | PDF mail. Unset mail is skipped when there is no prospect |

The API process does not run Playwright. Start `npm run worker` (or the `worker` service in `docker-compose.yml`) beside `npm run server`. The tunnel and gist discovery stay on so GitHub Pages can keep finding the API. Set `NO_TUNNEL=1` only when you do not want a public URL.
