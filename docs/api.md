# API Reference

The qaZAR API is an ESM Node/Express service running on port 8787 by default.

## Health Endpoints

### `GET /healthz` & `GET /api/health`
Returns system status, uptime, memory, and queue load.
```json
{
  "ok": true,
  "name": "qaZAR",
  "version": "0.1.0",
  "uptimeSec": 420,
  "memoryMb": 68,
  "activeRuns": 1
}
```

## Run Management Endpoints

### `POST /api/runs`
Submit a new site for QA testing. The GitHub Pages console calls this through the Cloudflare tunnel with no key. A partner (the Logi-Ink worker) sends `Authorization: Bearer` from `QAZAR_API_KEYS` (`keyId.secret.ownerId`). A public key is capped at `PUBLIC_MAX_PAGES` (default 5) and cannot set `renderJs` or `pages`. The response is `{ runId, shareToken }`.
- **Request Body**:
  ```json
  {
    "domain": "https://example.com",
    "sitemap_url": "https://example.com/sitemap.xml",
    "pages": "/pricing\n/about",
    "max_pages": 10,
    "renderJs": false
  }
  ```
When `pages` is set (one path or URL per line, or an array), the crawl stays on that list and ignores the sitemap. `max_pages` applies only when `pages` is empty.
- **Response**: `202 Accepted`
  ```json
  {
    "runId": "20261024194000-a1b2c3"
  }
  ```

### `GET /api/runs`
List previous runs sorted by creation date.

### `GET /api/runs/:id`
Retrieve detailed run metadata, viewport results, violation details, and visual diff percentages.

### `GET /api/runs/:id/events`
Server-Sent Events (SSE) live progress stream.
- Sends a snapshot every 2 seconds. The results page also polls, because some proxies buffer the stream.
- Event payload:
  ```json
  {
    "status": "capturing",
    "progress": { "pagesDone": 1, "pagesTotal": 5, "capturesDone": 4, "capturesTotal": 35 },
    "summary": null
  }
  ```

### `POST /api/runs/:id/baseline`
Promote run captures to baseline.
- **Request Body** (optional): `{ "slug": "slug-name", "viewport": "mobile" }`
- If body is empty, all valid captures in the run are promoted.

### `DELETE /api/runs/:id`
Cancel an active run and delete its artifacts.

### `GET /api/runs/:id/report`
Generates a client-ready HTML quality assessment report.
- **Query Parameters**:
  - `email=agency@dev.com`: Customizes the recipient email in the lead generation CTA.
  - `agency=Apex+Advisory`: Customizes the agency / consultant brand in header, footer, and lead CTA.
  - `download=1`: Sets `Content-Disposition: attachment` to trigger automatic browser file download.
- **HTML Report Features**:
  - Executive health score (0–100), letter grade (A–F), and status assessment.
  - Consolidated cross-viewport defect clustering (eliminating noise & duplication).
  - Remediation vs. Rebuild developer effort calculation.
  - 3-tier actionable implementation roadmap (Quick Wins, Core UX, Strategic Architecture).
  - Print/PDF export stylesheet with page-break protection.
  - One-click pre-formatted Markdown clipboard summary for Slack/Jira.
  - Public lead summary (heat, contacts, roles, booking links). Rules: [leads.md](leads.md). There is no JSON report.


## Artifacts Endpoint

### `GET /api/share/:token`
Redacted progress for the emailed link: `status`, `progress`, `score`, `grade`, `domain`. `GET /api/share/:token/report.pdf` returns the PDF once the worker has written it.

### `GET /api/artifacts/:runId/*`
Screenshots for the Pages console. A bearer key can read only that key's runs. The tunnel UI, which sends no key, can still load images.
