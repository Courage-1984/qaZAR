/**
 * Heuristic evaluator. Passed to page.evaluate(), so it MUST be fully self-contained
 * (no imports / outer-scope references). Returns an array of
 * { rule, severity, selector, rect, detail }.
 * Phase 1 rules: h-overflow, touch-target-size, body-font-size, media-bleed, heading-scale (data only).
 */
export function evaluate({ touch, viewportWidth }) {
  const MAX_PER_RULE = 50;
  const out = [];
  const counts = {};
  const add = (rule, severity, el, detail) => {
    counts[rule] = (counts[rule] || 0) + 1;
    if (counts[rule] > MAX_PER_RULE) return;
    const r = el ? el.getBoundingClientRect() : null;
    out.push({
      rule,
      severity,
      selector: el ? selectorOf(el) : null,
      rect: r ? { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) } : null,
      detail,
    });
  };

  function selectorOf(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement && parts.length < 5) {
      let part = cur.tagName.toLowerCase();
      const cls = [...cur.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
      part += cls;
      const sib = cur.parentElement && [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName);
      if (sib && sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function visible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // --- Horizontal overflow ---
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    add('h-overflow', 'error', null, `Document scrollWidth ${de.scrollWidth}px exceeds viewport ${de.clientWidth}px`);
    let n = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (n >= 15) break;
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > viewportWidth + 1) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') { clipped = true; break; }
        }
        if (!clipped) { add('h-overflow-offender', 'warn', el, `Right edge at ${Math.round(r.right)}px (viewport ${viewportWidth}px)`); n++; }
      }
    }
  }
  const bodyOx = getComputedStyle(document.body).overflowX;
  if ((bodyOx === 'hidden' || getComputedStyle(de).overflowX === 'hidden') && de.scrollWidth > viewportWidth + 1) {
    add('h-overflow-masked', 'warn', document.body, 'overflow-x:hidden is masking content wider than the viewport');
  }

  // --- Touch targets ---
  if (touch) {
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[onclick],[tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 48 || r.height < 48) {
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p,li,span,td');
        add('touch-target-size', inline ? 'warn' : 'error', el, `${Math.round(r.width)}x${Math.round(r.height)}px is below 48x48px${inline ? ' (inline text link)' : ''}`);
      }
    }
  }

  // --- Typography ---
  const bodyFont = parseFloat(getComputedStyle(document.body).fontSize);
  if (bodyFont < 16) add('body-font-size', 'error', document.body, `Body font-size is ${bodyFont}px (< 16px)`);
  // weighted median of text font sizes
  const sizes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const len = t.textContent.trim().length;
    if (len < 3 || !t.parentElement || !visible(t.parentElement)) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(t.parentElement.tagName)) continue;
    sizes.push([parseFloat(getComputedStyle(t.parentElement).fontSize), len]);
  }
  sizes.sort((a, b) => a[0] - b[0]);
  const total = sizes.reduce((s, x) => s + x[1], 0);
  let acc = 0, median = bodyFont;
  for (const [s, l] of sizes) { acc += l; if (acc >= total / 2) { median = s; break; } }
  if (median < 16 && median < bodyFont) add('text-font-size', 'warn', null, `Median rendered text size is ${median}px (< 16px)`);

  const headings = {};
  for (const h of ['h1', 'h2', 'h3']) {
    const el = [...document.querySelectorAll(h)].find(visible);
    if (el) headings[h] = parseFloat(getComputedStyle(el).fontSize);
  }

  // --- Media bleed ---
  for (const el of document.querySelectorAll('img,video,iframe,canvas,object,embed')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const parent = el.parentElement;
    const pr = parent ? parent.getBoundingClientRect() : null;
    const cs = getComputedStyle(el);
    const bleedsViewport = r.right > viewportWidth + 1;
    const bleedsParent = pr && r.width > pr.width + 1 && getComputedStyle(parent).overflowX === 'visible';
    if (bleedsViewport || bleedsParent) {
      add('media-bleed', 'error', el, `${el.tagName.toLowerCase()} is ${Math.round(r.width)}px wide, overflowing its ${bleedsViewport ? 'viewport' : 'container'}; max-width is "${cs.maxWidth}"`);
    }
  }

  return { violations: out, metrics: { bodyFont, medianText: median, headings, scrollWidth: de.scrollWidth, scrollHeight: de.scrollHeight } };
}
