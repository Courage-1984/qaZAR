---
description: Build, run, and verify the qaZAR containerized engine.
---

1. Build the production Docker container:
   ```bash
   docker build -t qazar:local .
   ```
2. Start the container in detached mode with memory flags for headless Chromium:
   ```bash
   docker run -d --name qazar-test -p 8787:8787 --shm-size=1gb qazar:local
   ```
3. Verify healthcheck:
   ```bash
   curl http://localhost:8787/api/health
   ```
4. Stop and remove the test container:
   ```bash
   docker stop qazar-test; docker rm qazar-test
   ```
