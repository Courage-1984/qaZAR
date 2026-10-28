/**
 * Reference Vanilla JS helpers for Logi-Ink contact/audit UI.
 * Copy into logi-ink `js/pages/contact.js` (already wired there).
 */

export function setAuditStatus(text) {
  const el = document.getElementById('auditStatus');
  if (el) el.textContent = text;
}

export function auditStatusLabel(body) {
  const status = body?.status || '';
  const pagesDone = body?.progress?.pagesDone;
  const pagesTotal = body?.progress?.pagesTotal;
  const progress =
    Number.isFinite(pagesDone) && Number.isFinite(pagesTotal) && pagesTotal > 0
      ? ` (${pagesDone}/${pagesTotal} pages)`
      : '';
  if (status === 'queued' || status === 'pending') return 'Crawling your site…';
  if (status === 'crawling' || status === 'profiling') return `Crawling your site…${progress}`;
  if (status === 'capturing') return `Capturing viewports…${progress}`;
  if (status === 'diffing') return 'Comparing against baselines…';
  if (status === 'reporting' || status === 'emailing') return 'Building your Logi-Ink report…';
  if (status === 'done') {
    return 'Audit complete. Check your inbox for the PDF — Dennis will follow up.';
  }
  if (status === 'failed') return 'Audit could not finish. We will email you shortly.';
  return status ? `Audit ${status}${progress}` : 'Crawling your site…';
}

export async function pollAudit(token, proxyRoot) {
  const root = String(proxyRoot || '').replace(/\/$/, '');
  const started = Date.now();
  while (Date.now() - started < 5 * 60 * 1000) {
    try {
      const res = await fetch(`${root}/audit/${encodeURIComponent(token)}`);
      const body = await res.json().catch(() => ({}));
      setAuditStatus(auditStatusLabel(body));
      if (body.status === 'done' || body.status === 'failed') return;
    } catch {
      setAuditStatus('Audit status will update when the server replies.');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  setAuditStatus('Audit is still running. We will email the PDF when it finishes.');
}
