/**
 * Heuristic evaluator. Passed to page.evaluate(), so it MUST be fully self-contained
 * (no imports / outer-scope references). Returns an array of
 * { rule, severity, selector, rect, detail }.
 *
 * Rules:
 * - h-overflow / h-overflow-offender / h-overflow-masked
 * - touch-target-size (info: optional 48px comfort, not WCAG AA)
 * - target-size-minimum (warn: WCAG 2.2 SC 2.5.8 AA, 24px box or 24px spacing; 44px is AAA, not claimed)
 * - body-font-size (info below 16px) / text-font-size / heading-hierarchy
 * - wcag-contrast (WCAG AA 4.5:1, 3:1 for large text; image, gradient, and pseudo paints are needs-review)
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

  // --- 2. Touch targets. 48px is advisory. AA is 24px, with a spacing exception. ---
  if (touch) {
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[onclick],[tabindex]:not([tabindex="-1"])';
    const boxes = [...document.querySelectorAll(sel)].filter(visible).map((el) => ({ el, r: el.getBoundingClientRect() }));
    for (const { el, r } of boxes) {
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (r.width < 48 || r.height < 48) {
        add('touch-target-size', 'info', el, `${w}x${h}px is below the optional 48px comfort size, not WCAG AA`);
      }
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && !!el.closest('p, li');
      if (inline || (r.width >= 24 && r.height >= 24)) continue;
      let nearest = Infinity;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      for (const other of boxes) {
        if (other.el === el) continue;
        const ox = other.r.left + other.r.width / 2;
        const oy = other.r.top + other.r.height / 2;
        nearest = Math.min(nearest, Math.hypot(cx - ox, cy - oy));
      }
      if (!(nearest < Infinity && nearest >= 24)) {
        add('target-size-minimum', 'warn', el, `${w}x${h}px is under 24px without a 24px gap to the nearest target (WCAG 2.2 SC 2.5.8 AA). A 44px box is AAA and is not claimed here.`);
      }
    }
  }

  // --- 3. Typography ---
  const bodyFont = parseFloat(getComputedStyle(document.body).fontSize);
  if (bodyFont < 16) add('body-font-size', 'info', document.body, `Body font-size is ${bodyFont}px, below the 16px reading suggestion`);

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
    const layers = [];
    let hasBgImage = false;
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const cs = getComputedStyle(cur);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') hasBgImage = true;
      for (const pseudo of ['::before', '::after']) {
        const pcs = getComputedStyle(cur, pseudo);
        if (pcs.content && pcs.content !== 'none' && pcs.content !== 'normal' && pcs.backgroundImage && pcs.backgroundImage !== 'none') {
          hasBgImage = true;
        }
      }
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) layers.push(c);
      cur = cur.parentElement;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = composite(layers[i], bg);
    return { color: bg, hasBgImage };
  }

  // Sample prominent visible text elements
  const textCandidates = document.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, button, a, label, span, li, dt, dd'
  );
  let checkedCount = 0;
  let contrastSampleCapped = false;
  for (const el of textCandidates) {
    if (checkedCount >= 60) {
      contrastSampleCapped = true;
      break;
    }
    if (!visible(el)) continue;
    const text = el.innerText ? el.innerText.trim() : '';
    if (text.length < 2) continue;
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg || fg.a < 0.1) continue;
    const childOwnsColour = [...el.children].some((ch) => visible(ch) && (ch.innerText || '').trim().length > 1 && getComputedStyle(ch).color !== cs.color);
    if (childOwnsColour) continue;
    checkedCount++;
    const { color: bg, hasBgImage } = getEffectiveBg(el);
    if (hasBgImage) {
      add('wcag-contrast-indeterminate', 'info', el, 'Text rests over a background image, gradient, or pseudo-element; needs review, not a confirmed contrast failure');
      continue;
    }
    const painted = fg.a < 1 ? composite(fg, bg) : fg;
    const lFg = relLuminance(painted);
    const lBg = relLuminance(bg);
    const ratio = contrastRatio(lFg, lBg);

    const fSize = parseFloat(cs.fontSize) || 16;
    const fWeight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = fSize >= 24 || (fSize >= 18.66 && fWeight >= 700);
    const minRatio = isLarge ? 3.0 : 4.5;
    if (ratio < minRatio) {
      add(
        'wcag-contrast',
        'error',
        el,
        `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA required ${minRatio}:1 (text: ${cs.color}, bg: rgb(${bg.r}, ${bg.g}, ${bg.b}))`
      );
    }
  }

  function clippedByAncestor(el) {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return true;
    }
    return false;
  }

  // --- 5. Media Bleed ---
  for (const el of document.querySelectorAll('img,video,iframe,canvas,object,embed')) {
    if (!visible(el) || clippedByAncestor(el)) continue;
    const r = el.getBoundingClientRect();
    const parent = el.parentElement;
    const pr = parent ? parent.getBoundingClientRect() : null;
    const cs = getComputedStyle(el);
    const bleedsViewport = r.right > viewportWidth + 1 || r.left < -1;
    const bleedsParent = pr && (r.right > pr.right + 1 || r.left < pr.left - 1) && getComputedStyle(parent).overflowX === 'visible';
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
      if (overlapW > 12 && overlapH > 12) {
        if (getComputedStyle(elA).position === 'fixed' || getComputedStyle(elB).position === 'fixed') continue;
        const mid = (box, other) => other.left + other.width / 2 >= box.left && other.left + other.width / 2 <= box.right && other.top + other.height / 2 >= box.top && other.top + other.height / 2 <= box.bottom;
        const covering = (elA.matches('a,button,input,[role="button"]') && mid(rB, rA)) || (elB.matches('a,button,input,[role="button"]') && mid(rA, rB));
        add('element-collision', 'warn', elA, `Possible overlap with ${selectorOf(elB)} by ${Math.round(overlapW)}x${Math.round(overlapH)}px${covering ? ' covering a control' : ''}`);
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
      const hasToggle = !!nav.querySelector('button[aria-expanded], button[aria-controls], button[aria-label*="menu" i], button[aria-label*="nav" i], .hamburger, .nav-toggle, .navbar-toggler')
        || (!!nav.id && !!document.querySelector(`button[aria-controls="${CSS.escape(nav.id)}"]`));
      if (!links.length && !hasToggle) {
        add('nav-not-collapsed', 'warn', nav, 'No visible navigation links and no menu toggle inside this nav');
        continue;
      }
      if (links.length < 4) continue;
      const first = links[0].getBoundingClientRect();
      const last = links[links.length - 1].getBoundingClientRect();
      const isHorizontal = Math.abs(first.top - last.top) < 15;
      const overflows = last.right > viewportWidth || navRect.width > viewportWidth * 0.9;
      if (isHorizontal && overflows) {
        add(
          'nav-not-collapsed',
          'warn',
          nav,
          hasToggle
            ? `A menu toggle is inside this nav but ${links.length} links are still visible across ${Math.round(navRect.width)}px`
            : `Navigation shows ${links.length} horizontal links across ${Math.round(navRect.width)}px on viewport ${viewportWidth}px and no menu toggle was found inside this nav`
        );
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
      capped: Object.keys(counts).filter((rule) => counts[rule] > MAX_PER_RULE),
      contrastSampleCapped,
      collisionSampleCapped: layoutElements.length > 60,
    },
  };
}
