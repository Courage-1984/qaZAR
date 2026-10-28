import crypto from 'node:crypto';

/** Fresh queued run document written by create(). */
export function newRunRecord(input, { ownerId = 'operator', now = () => new Date().toISOString() } = {}) {
  return {
    id: crypto.randomUUID(),
    shareToken: crypto.randomUUID(),
    ownerId,
    createdAt: now(),
    input,
    status: 'queued',
    progress: { pagesDone: 0, pagesTotal: 0 },
    pages: [],
    summary: null,
    error: null,
  };
}

/** Strip heavy page payloads from list responses. */
export function listRunSummary(run) {
  const { pages, ...rest } = run;
  return rest;
}

export function runEventPayload(run) {
  return {
    status: run.status,
    progress: run.progress,
    summary: run.summary,
  };
}

export function formatSseData(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}
