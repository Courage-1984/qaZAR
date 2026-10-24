/**
 * Modern dark-mode and print-ready stylesheet for executive audit reports.
 * @param {string} gradeColor
 * @returns {string}
 */
export function getReportStyles(gradeColor = '#10b981') {
  return `
    :root { --bg: #090d16; --card: #111827; --border: #1f2937; --text: #f3f4f6; --muted: #9ca3af; --accent: #6366f1; --grade: ${gradeColor}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding: 2rem 1rem; }
    .wrapper { max-width: 860px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .brand { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; } .brand span { color: var(--accent); }
    .badge-report { background: rgba(99,102,241,0.15); color: #818cf8; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
    .hero { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin-bottom: 2rem; display: flex; flex-wrap: wrap; align-items: center; gap: 2rem; }
    .grade-circle { width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--grade); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .grade-val { font-size: 2.25rem; font-weight: 800; color: var(--grade); line-height: 1; } .grade-score { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
    .hero-summary h1 { font-size: 1.5rem; margin-bottom: 0.5rem; } .hero-summary p { color: var(--muted); font-size: 0.95rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
    .card h3 { font-size: 0.85rem; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; margin-bottom: 0.5rem; } .card .val { font-size: 1.5rem; font-weight: 700; }
    .impact-section { margin-bottom: 2rem; } .impact-section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    .risk-item { background: var(--card); border-left: 4px solid var(--accent); padding: 1rem; border-radius: 0 8px 8px 0; margin-bottom: 0.75rem; }
    .risk-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; } .risk-desc { font-size: 0.85rem; color: var(--muted); }
    .cta-card { background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12)); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 2.25rem; text-align: center; margin-top: 2.5rem; }
    .cta-card h2 { font-size: 1.5rem; margin-bottom: 0.75rem; } .cta-card p { color: var(--muted); max-width: 600px; margin: 0 auto 1.5rem auto; font-size: 0.95rem; }
    .btn-cta { display: inline-block; background: var(--accent); color: #fff; font-weight: 600; padding: 0.85rem 1.75rem; border-radius: 8px; text-decoration: none; transition: opacity 0.15s; }
    .btn-cta:hover { opacity: 0.9; }
    .btn-print { background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: #fff; padding: 0.35rem 0.8rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; transition: background 0.15s; }
    .btn-print:hover { background: rgba(255,255,255,0.16); }
    .footer { text-align: center; margin-top: 3rem; color: var(--muted); font-size: 0.8rem; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .hero, .card, .risk-item, .cta-card { background: #f9f9f9; border-color: #ddd; color: #000; page-break-inside: avoid; }
      .btn-cta { border: 1px solid #000; background: none; color: #000; }
      .btn-print { display: none !important; }
    }
  `;
}
