import { calculateHealthScore } from './scoreCalculator.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/**
 * Generates an executive, client-ready UX/UI Audit Report HTML document.
 * Balances genuine business value with proprietary teaser analysis,
 * designed to capture qualified inbound leads for site redesigns/rebuilds.
 */
export function generateExecutiveReport(run, leadEmail = 'consulting@qazar.dev') {
  const { score, grade, status, recommendation, metrics, clusters, roiAssessment } = calculateHealthScore(run);
  const domain = run.input?.domain || 'Unknown Domain';
  const dateStr = new Date(run.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const topClusters = (clusters || []).slice(0, 8);

  const gradeColor =
    score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Executive UX/UI Quality &amp; Responsive Audit – ${esc(domain)}</title>
  <style>
    :root { --bg: #090d16; --card: #111827; --border: #1f2937; --text: #f3f4f6; --muted: #9ca3af; --accent: #6366f1; --grade: ${gradeColor}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding: 2rem 1rem; }
    .wrapper { max-width: 860px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .brand { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .brand span { color: var(--accent); }
    .badge-report { background: rgba(99,102,241,0.15); color: #818cf8; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
    .hero { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin-bottom: 2rem; display: flex; flex-wrap: wrap; align-items: center; gap: 2rem; }
    .grade-circle { width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--grade); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .grade-val { font-size: 2.25rem; font-weight: 800; color: var(--grade); line-height: 1; }
    .grade-score { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
    .hero-summary h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .hero-summary p { color: var(--muted); font-size: 0.95rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
    .card h3 { font-size: 0.85rem; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .card .val { font-size: 1.5rem; font-weight: 700; }
    .impact-section { margin-bottom: 2rem; }
    .impact-section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    .risk-item { background: var(--card); border-left: 4px solid var(--accent); padding: 1rem; border-radius: 0 8px 8px 0; margin-bottom: 0.75rem; }
    .risk-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
    .risk-desc { font-size: 0.85rem; color: var(--muted); }
    .cta-card { background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12)); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 2.25rem; text-align: center; margin-top: 2.5rem; }
    .cta-card h2 { font-size: 1.5rem; margin-bottom: 0.75rem; }
    .cta-card p { color: var(--muted); max-width: 600px; margin: 0 auto 1.5rem auto; font-size: 0.95rem; }
    .btn-cta { display: inline-block; background: var(--accent); color: #fff; font-weight: 600; padding: 0.85rem 1.75rem; border-radius: 8px; text-decoration: none; transition: opacity 0.15s; }
    .btn-cta:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 3rem; color: var(--muted); font-size: 0.8rem; }
    @media print {
      body { background: #fff; color: #000; }
      .hero, .card, .risk-item, .cta-card { background: #f9f9f9; border-color: #ddd; color: #000; }
      .btn-cta { border: 1px solid #000; background: none; color: #000; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div>
        <div class="brand"><span>qa</span>ZAR Executive Audit</div>
        <div style="font-size: 0.9rem; color: var(--muted); margin-top: 4px;">Target: <b>${esc(domain)}</b></div>
      </div>
      <div>
        <span class="badge-report">${esc(dateStr)}</span>
      </div>
    </div>

    <section class="hero">
      <div class="grade-circle">
        <div class="grade-val">${esc(grade)}</div>
        <div class="grade-score">${esc(score)}/100</div>
      </div>
      <div class="hero-summary">
        <span class="badge-report" style="margin-bottom: 0.5rem; display: inline-block;">${esc(status)}</span>
        <h1>Executive UX/UI Quality Assessment</h1>
        <p>${esc(recommendation)}. Testing evaluated ${metrics.totalPages} key pages across 7 isolated viewport resolutions (ultrawide, desktop, laptop, tablet, and mobile).</p>
      </div>
    </section>

    <div class="grid">
      <div class="card">
        <h3>Critical Defect Patterns</h3>
        <div class="val" style="color: #ef4444;">${metrics.distinctErrors} <small style="font-size:0.85rem;color:var(--muted);font-weight:400;">(${metrics.rawErrors} raw)</small></div>
      </div>
      <div class="card">
        <h3>Systemic Global Issues</h3>
        <div class="val" style="color: #f59e0b;">${metrics.globalDefects} <small style="font-size:0.85rem;color:var(--muted);font-weight:400;">site-wide</small></div>
      </div>
      <div class="card">
        <h3>Mobile Risk Score</h3>
        <div class="val">${metrics.categories.mobileTouch + metrics.categories.overflowBreakage > 0 ? 'High' : 'Low'}</div>
      </div>
      <div class="card">
        <h3>Tested Viewports</h3>
        <div class="val">7 Devices</div>
      </div>
    </div>

    <section class="impact-section">
      <h2>Business &amp; Conversion Impact</h2>
      <div class="risk-item">
        <div class="risk-title">📱 Mobile Conversion Friction (${metrics.categories.mobileTouch} issues detected)</div>
        <div class="risk-desc">Buttons or interactive tap targets smaller than 48px create tap errors and drop mobile checkout conversion rates by up to 28%.</div>
      </div>
      <div class="risk-item">
        <div class="risk-title">📐 Layout &amp; Horizontal Breakage (${metrics.categories.overflowBreakage} issues detected)</div>
        <div class="risk-desc">Elements exceeding viewport boundaries force awkward horizontal scrolling on smartphones, signaling unoptimized front-end engineering.</div>
      </div>
      <div class="risk-item">
        <div class="risk-title">⚖️ Accessibility &amp; Contrast Compliance (${metrics.categories.wcagContrast} issues detected)</div>
        <div class="risk-desc">Text elements failing WCAG AA contrast ratios (4.5:1) expose digital properties to European and US accessibility liability (ADA/EAA).</div>
      </div>
    </section>

    ${run.siteProfile ? `
    <section class="impact-section">
      <h2>Technical Stack &amp; Infrastructure Profile</h2>
      <div class="grid" style="margin-bottom: 1rem;">
        <div class="card">
          <h3>Server Latency</h3>
          <div class="val" style="${run.siteProfile.avgResponseTimeMs > 1000 ? 'color: #ef4444;' : 'color: #10b981;'}">${run.siteProfile.avgResponseTimeMs}ms</div>
        </div>
        <div class="card">
          <h3>Detected Stack</h3>
          <div class="val" style="font-size: 1rem; font-weight: 600;">${esc(run.siteProfile.techStack.join(', ') || 'Custom / Jamstack')}</div>
        </div>
        <div class="card">
          <h3>Security &amp; Trust</h3>
          <div class="val" style="font-size: 1rem; ${run.siteProfile.security?.score < 80 ? 'color: #ef4444;' : 'color: #10b981;'}">${run.siteProfile.security?.score || 100}/100 <small style="font-size: 0.75rem; display:block; color:var(--muted);">${esc(run.siteProfile.security?.flags?.join(', ') || '✓ Transport Protected')}</small></div>
        </div>
        <div class="card">
          <h3>Asset Compression</h3>
          <div class="val" style="font-size: 1rem;">${run.siteProfile.assetHygiene?.uncompressedCount > 0 ? '⚠️ Uncompressed' : '✓ Gzip/Brotli'}</div>
        </div>
      </div>
    </section>` : ''}

    ${topClusters.length ? `
    <section class="impact-section">
      <h2>Consolidated Defect Evidence (${metrics.distinctErrors} Distinct Issues Across ${metrics.totalPages} Pages)</h2>
      <div style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.75rem;">Repetitive cross-device duplicates clustered to highlight systemic layout bugs without noise.</div>
      ${topClusters.map((c) => `
        <div style="background: var(--card); border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 0.5rem; font-size: 0.85rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
            <b style="color: ${c.severity === 'error' ? '#ef4444' : '#f59e0b'};">${c.isGlobal ? '🌐 SITE-WIDE' : '📄 PAGE'}: ${esc(c.rule)}</b>
            <span style="color:var(--muted); font-size:0.75rem;">${c.totalOccurrences}&times; in ${c.viewports.length} viewports (${esc(c.viewports.join(', '))})</span>
          </div>
          <div style="color: var(--text);">${esc(c.detail)}</div>
          ${c.selector ? `<div style="color:var(--muted); font-family:monospace; font-size:0.75rem; margin-top:0.25rem;">${esc(c.selector)}</div>` : ''}
        </div>
      `).join('')}
    </section>` : ''}

    ${roiAssessment ? `
    <section class="impact-section">
      <h2>Engineering Remediation vs. Rebuild Assessment</h2>
      <div class="card" style="border-left: 4px solid ${roiAssessment.recommendationType === 'rebuild' ? '#a855f7' : '#10b981'};">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; color:var(--muted); letter-spacing:0.05em;">Strategic Recommendation</div>
            <div style="font-size:1.2rem; font-weight:700; color:#fff;">${esc(roiAssessment.recommendationTitle)}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; color:var(--muted); letter-spacing:0.05em;">Estimated Dev Effort</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--accent);">~${roiAssessment.estimatedHours} Engineering Hours</div>
          </div>
        </div>
        <p style="margin-top:0.75rem; font-size:0.9rem; color:var(--muted);">${esc(roiAssessment.recommendationReason)}</p>
      </div>
    </section>` : ''}

    <section class="cta-card">
      <h2>Turn Audit Findings Into High-Converting UX</h2>
      <p>Remediate responsive breakage, eliminate accessibility compliance liabilities, or discuss a modern, high-performance website rebuild engineered to pass 100% of multi-viewport tests.</p>
      <a class="btn-cta" href="mailto:${esc(leadEmail)}?subject=${encodeURIComponent(`Remediation Plan & Quote – ${domain}`)}&body=${encodeURIComponent(`Hi,\n\nI reviewed our qaZAR Quality Audit (Score: ${score}/100, Grade ${grade}) for ${domain}.\n\nStrategic Recommendation: ${roiAssessment?.recommendationTitle || ''} (Est. ${roiAssessment?.estimatedHours || 0} dev hours).\n\nWe would like to request an engineering remediation plan and redesign/rebuild quote.\n\nRun ID: ${run.id}`)}">Request Full Remediation Plan &amp; Rebuild Quote →</a>
    </section>

    <div class="footer">
      Generated by qaZAR Engine &bull; Automated 7-Viewport Quality Assurance Suite
    </div>
  </div>
</body>
</html>`;
}
