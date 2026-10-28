/** Pure capture payload / timing helpers. */

export function isFontPartial(fontWait) {
  return fontWait === 'cap';
}

export function captureTimings({ gotoMs, idleMs = 0, scrollMs, fontMs, shotMs }) {
  return { gotoMs, idleMs, scrollMs, fontMs, shotMs };
}

export function buildCapturePayload(result, timings, partial, leadHtml = '') {
  const payload = { ...result, timings, partial: Boolean(partial) };
  return leadHtml ? { ...payload, leadHtml } : payload;
}

/** Log line for viewport timing fields (or empty when missing). */
export function viewportTimingLine(vpName, timings) {
  if (!timings) return '';
  const m = timings;
  return `qaZAR viewport ${vpName} goto=${m.gotoMs} idle=${m.idleMs} scroll=${m.scrollMs} fonts=${m.fontMs} shot=${m.shotMs}`;
}
