import { api, esc } from './api.js';

export function cellInfo(rec) {
  if (!rec) return { cls: 'pending', label: '…' };
  if (rec.status === 'error') return { cls: 'error', label: 'ERR' };
  const errs = rec.violations.filter((v) => v.severity === 'error').length;
  const warns = rec.violations.filter((v) => v.severity === 'warn').length;
  let cls = errs ? 'error' : warns ? 'warn' : 'ok';
  if (rec.status === 'changed') cls += ' changed';
  const label = `${errs ? errs + 'E ' : ''}${warns ? warns + 'W' : ''}`.trim() || '✓';
  return { cls, label };
}

export function renderCell(run, selected) {
  const page = run.pages.find((p) => p.slug === selected.slug);
  const rec = page?.viewports[selected.vp];
  const el = document.getElementById('detail');
  if (!rec) return;
  const img = (rel, label) => rel ? `<figure><figcaption>${label}</figcaption><a href="${api.artifact(run.id, rel)}" target="_blank" rel="noopener"><img loading="lazy" alt="${label}" src="${api.artifact(run.id, rel)}"></a></figure>` : '';
  const v = rec.violations
    .map((x) => `<tr><td><span class="badge ${x.severity}">${esc(x.severity)}</span></td><td><code>${esc(x.rule)}</code></td><td>${esc(x.detail)}<div class="muted sm mono">${esc(x.selector || '')}${x.rect ? ` · 📐 ${x.rect.w}×${x.rect.h} @ (${x.rect.x},${x.rect.y})` : ''}</div></td></tr>`)
    .join('');
  el.innerHTML = `<div class="card" id="cell-detail"><h2>${esc(new URL(page.url).pathname)} · ${esc(selected.vp)}</h2>
    <p>Status: <span class="badge ${esc(rec.status)}">${esc(rec.status)}</span>${rec.diffPercent != null ? ` · diff ${rec.diffPercent}%` : ''}${rec.sizeChanged ? ' · size changed' : ''}</p>
    ${rec.error ? `<p class="msg bad">${esc(rec.error)}</p>` : ''}
    ${v ? `<table class="tbl"><thead><tr><th>Severity</th><th>Rule</th><th>Detail</th></tr></thead><tbody>${v}</tbody></table>` : '<p class="msg ok">No violations found.</p>'}
    <div class="shots">${img(rec.base, 'Baseline')}${img(rec.shot, 'Current')}${img(rec.diff, 'Diff')}</div>
    ${rec.shot ? '<button class="btn" id="promote-one">Set this capture as baseline</button>' : ''}</div>`;
  document.getElementById('promote-one')?.addEventListener('click', async () => {
    await api.promote(run.id, { slug: selected.slug, viewport: selected.vp });
    alert('Baseline updated.');
  });
}
