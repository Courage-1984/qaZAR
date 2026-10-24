/**
 * Heuristic evaluator. Passed to page.evaluate(), so it MUST be fully self-contained
 * (no imports / outer-scope references). Returns an array of
 * { rule, severity, selector, rect, detail }.
 *
 * Rules:
 * - h-overflow / h-overflow-offender / h-overflow-masked
 * - touch-target-size
 * - body-font-size / text-font-size / heading-hierarchy
 * - wcag-contrast (WCAG AA 4.5:1, 3:1 for large text)
 * - media-bleed
 * - element-collision
 * - nav-collapse (touch/mobile/tablet viewports)
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
      rect: r
        ? {
            x: Math.round(r.x + scrollX),
            y: Math.round(r.y + scrollY),
            w: Math.round(r.width),
            h: Math.round(r.height),
          }
        : null,
      detail,
    });
  };

  function selectorOf(el) {
    if (!el || el === document.body) return 'body';
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
    if (!el || el.nodeType !== 1) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // --- 1. Horizontal Overflow ---
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
          if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') {
            clipped = true;
            break;
          }
        }
        if (!clipped) {
          add('h-overflow-offender', 'warn', el, `Right edge at ${Math.round(r.right)}px (viewport ${viewportWidth}px)`);
          n++;
        }
      }
    }
  }
  const bodyOx = getComputedStyle(document.body).overflowX;
  if ((bodyOx === 'hidden' || getComputedStyle(de).overflowX === 'hidden') && de.scrollWidth > viewportWidth + 1) {
    add('h-overflow-masked', 'warn', document.body, 'overflow-x:hidden is masking content wider than the viewport');
  }

  // --- 2. Touch Targets ---
  if (touch) {
    const sel =
      'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[onclick],[tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 48 || r.height < 48) {
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p,li,span,td');
        add(
          'touch-target-size',
          inline ? 'warn' : 'error',
          el,
          `${Math.round(r.width)}x${Math.round(r.height)}px is below 48x48px${inline ? ' (inline text link)' : ''}`
        );
      }
    }
  }

  // --- 3. Typography ---
  const bodyFont = parseFloat(getComputedStyle(document.body).fontSize);
  if (bodyFont < 16) add('body-font-size', 'error', document.body, `Body font-size is ${bodyFont}px (< 16px)`);

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
  let acc = 0,
    median = bodyFont;
  for (const [s, l] of sizes) {
    acc += l;
    if (acc >= total / 2) {
      median = s;
      break;
    }
  }
  if (median < 16 && median < bodyFont) add('text-font-size', 'warn', null, `Median rendered text size is ${median}px (< 16px)`);

  const headings = {};
  for (const h of ['h1', 'h2', 'h3']) {
    const el = [...document.querySelectorAll(h)].find(visible);
    if (el) headings[h] = parseFloat(getComputedStyle(el).fontSize);
  }

  // Hierarchy check on the same viewport: H1 should generally be >= H2 >= H3
  if (headings.h1 && headings.h2 && headings.h2 > headings.h1 * 1.1) {
    const h2El = document.querySelector('h2');
    add('heading-hierarchy', 'warn', h2El, `H2 font-size (${headings.h2}px) is larger than H1 (${headings.h1}px)`);
  }
  if (headings.h2 && headings.h3 && headings.h3 > headings.h2 * 1.1) {
    const h3El = document.querySelector('h3');
    add('heading-hierarchy', 'warn', h3El, `H3 font-size (${headings.h3}px) is larger than H2 (${headings.h2}px)`);
  }

  // --- 4. Contrast Ratios (WCAG AA) ---
  function parseColor(str) {
    if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const m = str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
    if (m) {
      return {
        r: parseFloat(m[1]),
        g: parseFloat(m[2]),
        b: parseFloat(m[3]),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1,
      };
    }
    return null;
  }

  function composite(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 255, g: 255, b: 255, a: 0 };
    return {
      r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
      g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
      b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
      a,
    };
  }

  function relLuminance({ r, g, b }) {
    const sRGB = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return sRGB[0] * 0.2126 + sRGB[1] * 0.7152 + sRGB[2] * 0.0722;
  }

  function contrastRatio(lum1, lum2) {
    const l1 = Math.max(lum1, lum2);
    const l2 = Math.min(lum1, lum2);
    return (l1 + 0.05) / (l2 + 0.05);
  }

  function getEffectiveBg(el) {
    let cur = el;
    let bg = { r: 255, g: 255, b: 255, a: 0 }; // start transparent
    let hasBgImage = false;

    while (cur && cur.nodeType === 1) {
      const cs = getComputedStyle(cur);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        hasBgImage = true;
      }
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        bg = composite(c, bg);
        if (bg.a >= 0.99) break;
      }
      cur = cur.parentElement;
    }
    // If reached root without solid background, composite onto default white (#fff)
    if (bg.a < 0.99) {
      bg = composite(bg, { r: 255, g: 255, b: 255, a: 1 });
    }
    return { color: bg, hasBgImage };
  }

  // Sample prominent visible text elements
  const textCandidates = document.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, button, a, label, span, li, dt, dd'
  );
  let checkedCount = 0;
  for (const el of textCandidates) {
    if (checkedCount >= 60) break;
    if (!visible(el)) continue;
    // only check if element has non-empty direct text or single child text
    const text = el.innerText ? el.innerText.trim() : '';
    if (text.length < 2) continue;

    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg || fg.a < 0.1) continue;

    const { color: bg, hasBgImage } = getEffectiveBg(el);
    if (hasBgImage) {
      add('wcag-contrast-indeterminate', 'info', el, 'Text rests over background-image or gradient; manual review suggested');
      continue;
    }

    const lFg = relLuminance(fg);
    const lBg = relLuminance(bg);
    const ratio = contrastRatio(lFg, lBg);

    const fSize = parseFloat(cs.fontSize) || 16;
    const fWeight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = fSize >= 24 || (fSize >= 18.66 && fWeight >= 700);
    const minRatio = isLarge ? 3.0 : 4.5;

    checkedCount++;
    if (ratio < minRatio) {
      add(
        'wcag-contrast',
        'error',
        el,
        `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA required ${minRatio}:1 (text: ${cs.color}, bg: rgb(${bg.r}, ${bg.g}, ${bg.b}))`
      );
    }
  }

  // --- 5. Media Bleed ---
  for (const el of document.querySelectorAll('img,video,iframe,canvas,object,embed')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const parent = el.parentElement;
    const pr = parent ? parent.getBoundingClientRect() : null;
    const cs = getComputedStyle(el);
    const bleedsViewport = r.right > viewportWidth + 1;
    const bleedsParent = pr && r.width > pr.width + 1 && getComputedStyle(parent).overflowX === 'visible';
    if (bleedsViewport || bleedsParent) {
      add(
        'media-bleed',
        'error',
        el,
        `${el.tagName.toLowerCase()} is ${Math.round(r.width)}px wide, overflowing its ${bleedsViewport ? 'viewport' : 'container'}; max-width is "${cs.maxWidth}"`
      );
    }
  }

  // --- 6. Element Collisions / Overlapping ---
  // Detect overlapping bounding boxes on key visible interactive or text nodes
  const layoutElements = [
    ...document.querySelectorAll('h1, h2, h3, p, button, a.btn, input, nav a, .card, .btn'),
  ].filter((el) => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 20 && r.height > 15;
  });

  const sampleLimit = Math.min(layoutElements.length, 60);
  for (let i = 0; i < sampleLimit; i++) {
    const elA = layoutElements[i];
    const rA = elA.getBoundingClientRect();

    for (let j = i + 1; j < sampleLimit; j++) {
      const elB = layoutElements[j];
      // Skip ancestor-descendant relationships
      if (elA.contains(elB) || elB.contains(elA)) continue;

      const rB = elB.getBoundingClientRect();
      const intersects =
        rA.left < rB.right &&
        rA.right > rB.left &&
        rA.top < rB.bottom &&
        rA.bottom > rB.top;

      if (!intersects) continue;

      const overlapW = Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left);
      const overlapH = Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top);

      // Substantial overlap check (> 12px in both dimensions)
      if (overlapW > 12 && overlapH > 12) {
        const csA = getComputedStyle(elA);
        const csB = getComputedStyle(elB);

        // If one is background or modal/dropdown overlay, skip
        const posA = csA.position;
        const posB = csB.position;
        if (posA === 'fixed' || posB === 'fixed') continue;

        // Check if both elements are in document flow or collide in the same stacking plane
        add(
          'element-collision',
          'warn',
          elA,
          `Element overlaps with ${selectorOf(elB)} by ${Math.round(overlapW)}x${Math.round(overlapH)}px`
        );
      }
    }
  }

  // --- 7. Standard Navigation Collapse (Mobile/Tablet) ---
  if (touch || viewportWidth <= 768) {
    const navs = document.querySelectorAll('nav, [role=navigation], header nav');
    for (const nav of navs) {
      if (!visible(nav)) continue;
      const navCs = getComputedStyle(nav);
      if (navCs.overflowX === 'auto' || navCs.overflowX === 'scroll') continue;
      const links = [...nav.querySelectorAll('a[href]')].filter(visible);
      const navRect = nav.getBoundingClientRect();

      // If navigation has 4 or more visible links horizontally stretched without wrapping or collapse
      if (links.length >= 4) {
        const first = links[0].getBoundingClientRect();
        const last = links[links.length - 1].getBoundingClientRect();
        const isHorizontal = Math.abs(first.top - last.top) < 15;

        // Check if there is an off-canvas / hamburger menu toggle button present
        const hasToggle = !!document.querySelector(
          'button[aria-expanded], button[aria-controls], button[aria-label*="menu" i], button[aria-label*="nav" i], .hamburger, [data-toggle="collapse"], .nav-toggle, #menu-toggle, .navbar-toggler'
        );

        if (isHorizontal && (last.right > viewportWidth || navRect.width > viewportWidth * 0.9) && !hasToggle) {
          add(
            'nav-not-collapsed',
            'warn',
            nav,
            `Navigation shows ${links.length} horizontal links across ${Math.round(navRect.width)}px on viewport ${viewportWidth}px without responsive hamburger/collapse toggle`
          );
        }
      }
    }
  }

  return {
    violations: out,
    metrics: {
      bodyFont,
      medianText: median,
      headings,
      scrollWidth: de.scrollWidth,
      scrollHeight: de.scrollHeight,
    },
  };
}
