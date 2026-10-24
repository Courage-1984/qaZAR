---
name: benchmark-run
description: Benchmark capture performance across all 7 viewports and measure queue throughput.
---

# Benchmark Run

Measure capture duration, memory consumption, and concurrency efficiency.

## Procedure

1. Ensure the API server is active:
   ```bash
   npm run server
   ```
2. Trigger a 1-page run against a lightweight public target:
   ```bash
   curl -s -X POST http://localhost:8787/api/runs -H "Content-Type: application/json" -d "{\"domain\":\"https://example.com\",\"max_pages\":1}"
   ```
3. Extract `runId` from the JSON response.
4. Listen to the event stream or poll until completed:
   ```bash
   curl -N http://localhost:8787/api/runs/<runId>/events
   ```
5. Fetch run summary:
   ```bash
   curl -s http://localhost:8787/api/runs/<runId>
   ```
6. Verify:
   - All 7 viewports completed without timeout.
   - Total run time under 10 seconds for a single page.
