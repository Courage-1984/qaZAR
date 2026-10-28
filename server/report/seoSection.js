import { esc } from './esc.js';
import { pathOf, seoScoreColor, summarizeSeoInfo } from './seoHelpers.js';

/** Search-appearance block for the executive report. All interpolated text is escaped. */

export function renderSeoSection(profile) {
  const seo = profile?.seo;
  if (!seo) return '';
  const issues = seo.issues || [];
  const shown = issues.filter((i) => i.severity !== 'info').slice(0, 8);
  const infoLine = summarizeSeoInfo(issues);
  const rows = (seo.pages || []).slice(0, 15);
  const extra = (seo.pages || []).length - rows.length;
  const color = seoScoreColor(seo.score);
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warns = issues.filter((i) => i.severity === 'warn').length;

  return `
    <section class="impact-section">
      <h2>Search Appearance</h2>
      <div class="grid" style="margin-bottom: 1rem;">
        <div class="card">
          <h3>Search Score</h3>
          <div class="val" style="color:${color}">${esc(seo.score)}/100</div>
        </div>
        <div class="card">
          <h3>Index &amp; Titles</h3>
          <div class="val" style="font-size: 0.95rem;">${errors ? `<span style="color:#ef4444;">${errors} error(s)</span>` : '<span style="color:#10b981;">✓ No index blocks</span>'}
            <small style="font-size: 0.75rem; display:block; color:var(--muted);">${warns} warning(s) on ${(seo.pages || []).length} page(s)</small>
          </div>
        </div>
      </div>
      ${shown.length ? shown.map((item) => `
        <div class="cluster">
          <b style="color:${item.severity === 'error' ? '#ef4444' : '#f59e0b'};">${esc(item.severity)}</b>
          <span style="color:var(--muted);"> ${esc(pathOf(item.url))}</span>
          <div>${esc(item.detail)}</div>
        </div>`).join('') : '<div style="font-size:0.85rem; color:#10b981;">No title, description, or indexability problems on the captured pages.</div>'}
      ${infoLine ? `<p style="font-size:0.8rem; color:var(--muted); margin:0.6rem 0;">Also noted: ${esc(infoLine)}.</p>` : ''}
      ${rows.length ? `
      <table class="seo-table">
        <thead><tr><th>Path</th><th>Title</th><th>Description</th><th>Indexable</th></tr></thead>
        <tbody>
          ${rows.map((p) => `<tr>
            <td>${esc(pathOf(p.url))}</td>
            <td>${esc(p.title || '—')}</td>
            <td>${esc(p.descriptionLength || 0)}</td>
            <td>${p.indexable ? 'Yes' : 'No'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}
      ${extra > 0 ? `<p style="font-size:0.8rem; color:var(--muted);">And ${extra} more captured page(s).</p>` : ''}
      <p style="font-size:0.75rem; color:var(--muted); margin-top:0.5rem;">Read from the static HTML response. Titles injected only by JavaScript are not visible here.</p>
    </section>`;
}
