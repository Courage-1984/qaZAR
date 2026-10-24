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
Submit a new site for QA testing.
- **Request Body**:
  ```json
  {
    "domain": "https://example.com",
    "sitemap_url": "https://example.com/sitemap.xml",
    "max_pages": 10,
    "renderJs": false
  }
  ```
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
- Connects client for real-time progress updates without polling.
- Emits heartbeat ping (`: keep-alive\n\n`) every 15s to keep proxy connections alive.
- Event payload:
  ```json
  {
    "status": "capturing",
    "progress": { "pagesDone": 2, "pagesTotal": 5 },
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
Generates a client-ready quality assessment report or JSON health summary.
- **Query Parameters**:
  - `format=json`: Returns machine-readable JSON containing score, grade, clusters, dev effort estimation (`roiAssessment`), 3-tier roadmap, and tech stack profile.
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


## Artifacts Endpoint

### `GET /api/artifacts/:runId/*`
Serves screenshots, baseline snapshots, and diff overlays directly from the storage adapter.
