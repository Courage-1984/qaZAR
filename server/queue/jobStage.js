/** Pure stage / cancel / fail helpers for processRun. */

export function isRunCancelled(run) {
  return !run || run.status === 'cancelled';
}

/** Advance seen.current when stage changes; returns whether it changed. */
export function advanceStage(seen, stage) {
  if (!stage || stage === seen?.current) return false;
  seen.current = stage;
  return true;
}

export function stageLogLine(runId, stage) {
  return `qaZAR worker ${runId} ${stage}`;
}

export function failRunFields(err, now = new Date()) {
  return {
    status: 'failed',
    error: String(err?.message || err),
    finishedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
  };
}

export function doneRunFields(summary, captureMs, now = new Date()) {
  return {
    status: 'done',
    summary,
    captureMs,
    finishedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
  };
}
