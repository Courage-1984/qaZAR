/**
 * Purple-pink executive report styles. Print stays light so PDF output remains readable.
 * @param {string} gradeColor
 * @returns {string}
 */
export function getReportStyles(gradeColor = '#4ade80') {
  return `
    :root { --bg:#070514; --card:rgba(28,12,48,.82); --border:rgba(244,114,182,.32); --text:#f7f2ff; --muted:#c9b6de; --accent:#e879f9; --grade:${gradeColor}; --ok:#4ade80; --warn:#fbbf24; --bad:#fb7185; }
    * { box-sizing: border-box; }
    body { margin:0; background:#070514; color:var(--text); font-family:Inter,system-ui,sans-serif; line-height:1.5; padding:1.5rem 1rem; }
    .bg-glow { position:fixed; inset:0; z-index:-1; background:
      radial-gradient(800px 420px at 0% 0%,rgba(168,85,247,.45),transparent 60%),
      radial-gradient(640px 380px at 100% 0%,rgba(244,114,182,.35),transparent 55%); }
    .wrapper { width:min(860px,100%); margin:0 auto; }
    a { color:#f9a8d4; display:inline-block; min-height:48px; line-height:1.4; padding:.55rem 0; max-width:100%; overflow-wrap:anywhere; }
    .header { display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; align-items:center; border-bottom:1px solid var(--border); padding-bottom:1.25rem; margin-bottom:1.5rem; }
    .brand { font-size:1.25rem; font-weight:800; letter-spacing:-.03em; background:linear-gradient(90deg,#d8b4fe,#f472b6); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .actions { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .badge-report { background:rgba(168,85,247,.2); color:#f5d0fe; font-size:.75rem; font-weight:700; padding:.35rem .7rem; border-radius:999px; border:1px solid var(--border); }
    .hero { background:var(--card); border:1px solid var(--border); border-radius:18px; padding:1.5rem; margin-bottom:1.5rem; display:flex; flex-wrap:wrap; align-items:center; gap:1.5rem; box-shadow:0 20px 50px rgba(0,0,0,.35); }
    .grade-circle { width:108px; height:108px; border-radius:50%; border:3px solid var(--grade); display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; background:radial-gradient(circle at 30% 30%,rgba(244,114,182,.35),transparent 62%); box-shadow:0 0 36px rgba(168,85,247,.35); }
    .grade-val { font-size:2.25rem; font-weight:800; color:var(--grade); line-height:1; }
    .grade-score { font-size:.8rem; color:var(--muted); }
    .hero-summary h1 { font-size:clamp(1.35rem,3vw,1.7rem); margin:.35rem 0; }
    .hero-summary p, .muted, .note { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:1rem; margin-bottom:1.5rem; }
    .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:1.15rem; box-shadow:inset 0 1px 0 rgba(255,255,255,.05); }
    .card h3 { font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:0 0 .4rem; }
    .val { font-size:1.35rem; font-weight:800; overflow-wrap:anywhere; }
    .val.bad, .bad { color:var(--bad); } .val.ok, .ok { color:var(--ok); } .val.warn, .warn { color:var(--warn); }
    .impact-section { margin-bottom:1.75rem; }
    .impact-section h2 { font-size:1.2rem; margin:0 0 .8rem; }
    .risk-item, .cluster { background:var(--card); border:1px solid var(--border); border-left:4px solid var(--accent); padding:1rem; border-radius:0 12px 12px 0; margin-bottom:.75rem; }
    .risk-title { font-weight:700; } .risk-desc, .cluster .meta { font-size:.85rem; color:var(--muted); }
    .tier-ok { border-top:3px solid var(--ok); } .tier-warn { border-top:3px solid var(--warn); } .tier-accent { border-top:3px solid #a855f7; }
    .reco { border-left:4px solid var(--accent); }
    .split { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; align-items:center; }
    .contacts { display:flex; flex-wrap:wrap; gap:1rem 1.5rem; align-items:center; }
    .cta-card { background:linear-gradient(135deg,rgba(168,85,247,.22),rgba(244,114,182,.16)); border:1px solid rgba(244,114,182,.45); border-radius:18px; padding:1.75rem 1.25rem; text-align:center; margin-top:2rem; }
    .cta-card h2 { margin-top:0; }
    .cta-card p { color:var(--muted); max-width:40rem; margin:0 auto 1rem; }
    .btn-cta, .btn-print { min-height:48px; max-width:100%; display:inline-flex; align-items:center; justify-content:center; text-align:center; border-radius:12px; font-weight:700; text-decoration:none; padding:0 1rem; }
    .btn-cta { background:linear-gradient(90deg,#a855f7,#f472b6); color:#1a0418; }
    .btn-print { background:rgba(255,255,255,.06); border:1px solid var(--border); color:#fff; cursor:pointer; }
    .seo-table { width:100%; border-collapse:collapse; font-size:.8rem; }
    .seo-table th, .seo-table td { text-align:left; padding:.4rem; border-bottom:1px solid var(--border); overflow-wrap:anywhere; }
    .footer { text-align:center; margin-top:2rem; color:var(--muted); font-size:.8rem; }
    @media print {
      body { background:#fff; color:#111; padding:0; }
      .bg-glow, .btn-print { display:none !important; }
      .hero, .card, .risk-item, .cluster, .cta-card { background:#f7f7f8; border-color:#ccc; color:#111; box-shadow:none; }
      .brand, .grad { color:#111; -webkit-text-fill-color:#111; }
      .btn-cta { border:1px solid #111; background:none; color:#111; }
    }
  `;
}
