/** Light A4 styles for the emailed PDF. Not used by the on-screen report. */
export function getPdfStyles() {
  return `
    @page { size: A4; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #1c1917; }
    body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 11pt; line-height: 1.45; }
    h1 { font-size: 22pt; line-height: 1.15; margin: 0 0 8pt; }
    h2 { font-size: 14pt; margin: 16pt 0 8pt; page-break-after: avoid; }
    h3 { font-size: 9pt; letter-spacing: .04em; text-transform: uppercase; color: #57534e; margin: 0 0 4pt; }
    p { margin: 0 0 8pt; }
    a { color: #7c2d12; text-decoration: underline; display: inline; min-height: 0; padding: 0; }
    .cover { border-bottom: 3px solid #7c2d12; padding-bottom: 14pt; margin-bottom: 14pt; break-after: avoid; }
    .kicker { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; color: #7c2d12; font-weight: 700; }
    .domain { font-size: 12pt; color: #44403c; margin-top: 4pt; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin: 12pt 0 4pt; }
    .card, .cluster, .risk-item { break-inside: avoid; page-break-inside: avoid; }
    .card { border: 1px solid #e7e5e4; border-radius: 6pt; padding: 8pt 10pt; background: #fafaf9; }
    .val { font-size: 13pt; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
    .risk-item, .cluster { border: 1px solid #e7e5e4; border-left: 4px solid #7c2d12; padding: 8pt 10pt; margin: 0 0 8pt; border-radius: 0 6pt 6pt 0; }
    .risk-title { font-weight: 700; }
    .risk-desc, .meta, .muted { color: #57534e; font-size: 10pt; }
    .bad { color: #b91c1c; } .warn { color: #a16207; } .ok { color: #166534; }
    .split { display: flex; justify-content: space-between; gap: 8pt; }
    .tier-ok { border-top: 3px solid #166534; }
    .tier-warn { border-top: 3px solid #a16207; }
    .tier-accent { border-top: 3px solid #7c2d12; }
    .contacts { display: flex; flex-wrap: wrap; gap: 8pt 16pt; }
    .seo-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .seo-table th, .seo-table td { text-align: left; padding: 3pt 4pt; border-bottom: 1px solid #e7e5e4; word-break: break-word; }
    .close { margin-top: 16pt; padding-top: 8pt; border-top: 1px solid #e7e5e4; color: #44403c; }
  `;
}
