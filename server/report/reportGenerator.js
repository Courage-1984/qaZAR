import { calculateHealthScore } from './scoreCalculator.js';
import { getReportStyles } from './reportStyles.js';
import { renderSeoSection } from './seoSection.js';
import { renderLeadSection } from './leadSection.js';

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
export function generateExecutiveReport(run, leadEmail = 'consulting@qazar.dev', options = {}) {
  const { score, grade, status, recommendation, metrics, clusters, roiAssessment, roadmap } = calculateHealthScore(run);
  const domain = run.input?.domain || 'Unknown Domain';
  const agency = options.agency || 'qaZAR Executive Audit';
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
  <title>${esc(agency)} – ${esc(domain)}</title>
  <style>${getReportStyles(gradeColor)}</style>
</head>
<body>
  <div class="bg-glow" aria-hidden="true"></div>
  <div class="wrapper">
    <div class="header">
      <div>
        <div class="brand">${esc(agency)}</div>
        <div class="muted">Target: <b>${esc(domain)}</b></div>
      </div>
      <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
        <button class="btn-print" onclick="navigator.clipboard.writeText(document.getElementById('summary-md').textContent).then(()=>alert('Executive summary copied!'))">📋 Copy Summary</button>
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

    ${renderLeadSection(run.siteProfile)}

    <div class="grid">
      <div class="card">
        <h3>Critical Defect Patterns</h3>
        <div class="val bad">${metrics.distinctErrors} <small class="muted">(${metrics.rawErrors} raw)</small></div>
      </div>
      <div class="card">
        <h3>Systemic Global Issues</h3>
        <div class="val warn">${metrics.globalDefects} <small class="muted">site-wide</small></div>
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
      ${metrics.categories.mobileTouch > 0 ? `
      <div class="risk-item">
        <div class="risk-title">📱 Mobile Conversion Friction (${metrics.categories.mobileTouch} issues detected)</div>
        <div class="risk-desc">Buttons or interactive tap targets smaller than 48px create tap errors and drop mobile checkout conversion rates by up to 28%.</div>
      </div>` : ''}
      ${metrics.categories.overflowBreakage > 0 ? `
      <div class="risk-item">
        <div class="risk-title">📐 Layout &amp; Horizontal Breakage (${metrics.categories.overflowBreakage} issues detected)</div>
        <div class="risk-desc">Elements exceeding viewport boundaries force awkward horizontal scrolling on smartphones, signaling unoptimized front-end engineering.</div>
      </div>` : ''}
      ${metrics.categories.wcagContrast > 0 ? `
      <div class="risk-item">
        <div class="risk-title">⚖️ Accessibility &amp; Contrast Compliance (${metrics.categories.wcagContrast} issues detected)</div>
        <div class="risk-desc">Text elements failing WCAG AA contrast ratios (4.5:1) expose digital properties to European and US accessibility liability (ADA/EAA).</div>
      </div>` : ''}
      ${(metrics.categories.mobileTouch === 0 && metrics.categories.overflowBreakage === 0 && metrics.categories.wcagContrast === 0) ? `
      <div class="risk-item">
        <div class="risk-title ok">✓ High Structural &amp; Layout Health</div>
        <div class="risk-desc">Zero critical layout collisions, horizontal overflows, or accessibility contrast violations detected.</div>
      </div>` : ''}
    </section>

    ${run.siteProfile ? `
    <section class="impact-section">
      <h2>Technical Stack &amp; Infrastructure Profile</h2>
      <div class="grid" style="margin-bottom: 1rem;">
        <div class="card">
          <h3>Server Latency</h3>
          <div class="val ${run.siteProfile.avgResponseTimeMs > 1000 ? 'bad' : 'ok'}">${run.siteProfile.avgResponseTimeMs}ms</div>
        </div>
        <div class="card">
          <h3>Detected Stack</h3>
          <div class="val" style="font-size: 1rem; font-weight: 600;">${esc((run.siteProfile.techStack || []).join(', ') || 'Custom / Jamstack')}</div>
        </div>
        <div class="card">
          <h3>Security &amp; Trust</h3>
          <div class="val ${run.siteProfile.security?.score < 80 ? 'bad' : 'ok'}">${run.siteProfile.security?.score || 100}/100 <small class="muted">${esc(run.siteProfile.security?.flags?.join(', ') || '✓ Transport Protected')}</small></div>
        </div>
        <div class="card">
          <h3>Asset &amp; Script Hygiene</h3>
          <div class="val" style="font-size: 0.95rem;">
            ${run.siteProfile.assetHygiene?.blockingScriptsTotal > 0 ? `<span style="color: #f59e0b;">⚠️ ${run.siteProfile.assetHygiene.blockingScriptsTotal} Blocking Script(s)</span>` : '<span style="color: #10b981;">✓ Async/Defer Optimized</span>'}
            <small style="font-size: 0.75rem; display: block; color: var(--muted);">${run.siteProfile.assetHygiene?.uncompressedCount > 0 ? '⚠️ Uncompressed HTML' : '✓ Gzip/Brotli'} · ${run.siteProfile.assetHygiene?.unlazyImagesTotal || 0} unlazy imgs</small>
          </div>
        </div>
        <div class="card">
          <h3>Conversion Funnel</h3>
          <div class="val" style="font-size: 0.95rem;">
            ${run.siteProfile.funnel?.brokenLinks?.length > 0 ? `<span style="color:#ef4444;">🚨 ${run.siteProfile.funnel.brokenLinks.length} Broken Link(s)</span>` : (run.siteProfile.funnel?.insecureFormsCount > 0 ? `<span style="color:#ef4444;">⚠️ Insecure Form Post</span>` : `<span style="color:#10b981;">✓ ${[run.siteProfile.funnel?.hasLeadForm ? 'Lead Forms' : null, run.siteProfile.funnel?.hasPricing ? 'Pricing' : null, run.siteProfile.funnel?.hasCheckout ? 'Checkout' : null, run.siteProfile.funnel?.hasContact ? 'Contact' : null].filter(Boolean).join(' · ') || 'Brochureware'}</span>`)}
          </div>
        </div>
        <div class="card">
          <h3>SEO &amp; Brand Previews</h3>
          <div class="val" style="font-size: 0.95rem;">
            ${run.siteProfile.socialSharing?.pageCount ? `<span>Open Graph ${run.siteProfile.socialSharing.openGraphPages || 0}/${run.siteProfile.socialSharing.pageCount}</span>` : (run.siteProfile.socialSharing?.hasOpenGraph ? '<span style="color:#10b981;">✓ Rich OpenGraph Cards</span>' : '<span style="color:#f59e0b;">⚠️ Missing og:image Card</span>')}
            <small style="font-size: 0.75rem; display: block; color: var(--muted);">${run.siteProfile.socialSharing?.pageCount ? `Canonical ${run.siteProfile.socialSharing.canonicalPages || 0}/${run.siteProfile.socialSharing.pageCount}` : (run.siteProfile.socialSharing?.hasCanonical ? '✓ Canonical' : '⚠️ No Canonical')} · ${run.siteProfile.crawlMeta?.hasRobotsTxt === false ? '⚠️ No Robots.txt' : '✓ Robots.txt'}</small>
          </div>
        </div>
      </div>
    </section>` : ''}
    ${renderSeoSection(run.siteProfile)}

    ${topClusters.length ? `
    <section class="impact-section">
      <h2>Consolidated Defect Evidence (${metrics.distinctErrors} Distinct Issues Across ${metrics.totalPages} Pages)</h2>
      <div style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.75rem;">Repetitive cross-device duplicates clustered to highlight systemic layout bugs without noise.</div>
      ${topClusters.map((c) => `
        <div class="cluster">
          <div class="split">
            <b class="${c.severity === 'error' ? 'bad' : 'warn'}">${c.isGlobal ? '🌐 SITE-WIDE' : '📄 PAGE'}: ${esc(c.rule)}</b>
            <span class="meta">${c.totalOccurrences}&times; in ${c.viewports.length} viewports (${esc(c.viewports.join(', '))})</span>
          </div>
          <div style="color: var(--text);">${esc(c.detail)}</div>
          ${c.selector ? `<div style="color:var(--muted); font-family:monospace; font-size:0.75rem; margin-top:0.25rem;">${esc(c.selector)}</div>` : ''}
        </div>
      `).join('')}
    </section>` : ''}

    ${(roadmap && (roadmap.quickWins.length || roadmap.coreUx.length || roadmap.strategic.length)) ? `
    <section class="impact-section">
      <h2>Prioritized Implementation Roadmap</h2>
      <div class="grid" style="margin-bottom:0;">
        <div class="card tier-ok">
          <h3 class="ok">Tier 1 · Quick Wins</h3>
          ${roadmap.quickWins.map((w) => `<div style="font-size:0.85rem; margin-bottom:0.35rem;">⚡ ${esc(w)}</div>`).join('') || '<div style="font-size:0.85rem; color:var(--muted);">✓ No quick blockers.</div>'}
        </div>
        <div class="card tier-warn">
          <h3 class="warn">Tier 2 · UX &amp; Accessibility</h3>
          ${roadmap.coreUx.map((u) => `<div style="font-size:0.85rem; margin-bottom:0.35rem;">🛠️ ${esc(u)}</div>`).join('') || '<div style="font-size:0.85rem; color:var(--muted);">✓ Layout compliant.</div>'}
        </div>
        <div class="card tier-accent">
          <h3>Tier 3 · Strategic Architecture</h3>
          ${roadmap.strategic.map((s) => `<div style="font-size:0.85rem; margin-bottom:0.35rem;">🏛️ ${esc(s)}</div>`).join('') || '<div style="font-size:0.85rem; color:var(--muted);">✓ Sound architecture.</div>'}
        </div>
      </div>
    </section>` : ''}

    ${roiAssessment ? `
    <section class="impact-section">
      <h2>Engineering Remediation vs. Rebuild Assessment</h2>
      <div class="card reco">
        <div class="split">
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
      <a class="btn-cta" href="mailto:${esc(leadEmail)}?subject=${encodeURIComponent(`Remediation Plan & Quote – ${domain}`)}&body=${encodeURIComponent(`Hi,\n\nI reviewed our Quality Audit (Score: ${score}/100, Grade ${grade}) for ${domain}.\n\nStrategic Recommendation: ${roiAssessment?.recommendationTitle || ''} (Est. ${roiAssessment?.estimatedHours || 0} dev hours).\n\nWe would like to request an engineering remediation plan and redesign/rebuild quote from ${agency}.\n\nRun ID: ${run.id}`)}">Request Full Remediation Plan &amp; Rebuild Quote →</a>
    </section>

    <div class="footer">Generated by ${esc(agency)} &bull; Automated 7-Viewport Quality Assurance Suite</div>
  </div>
  <script type="text/plain" id="summary-md"># ${esc(agency)}: ${esc(domain)}
Score: ${score}/100 (Grade ${esc(grade)}) – ${esc(status)}
Pages Tested: ${metrics.totalPages} (${metrics.totalCaptures} captures across 7 devices)
Defects: ${metrics.distinctErrors} distinct clusters (${metrics.globalDefects} site-wide)
Dev Effort: ~${roiAssessment?.estimatedHours || 0}h (${esc(roiAssessment?.recommendationTitle || '')})
Report ID: ${esc(run.id)}</script>
</body>
</html>`;
}
