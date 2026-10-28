/** Component titles and business-impact framing for defect clusters (UK spelling). */

const RULE_NAMES = {
  'target-size-minimum': 'Touch targets too small',
  'wcag-contrast': 'Low text contrast',
  'wcag-contrast-indeterminate': 'Contrast needs review',
  'element-collision': 'Overlapping controls',
  'h-overflow': 'Horizontal overflow',
  'overflow-x': 'Horizontal overflow',
  'media-bleed': 'Media escaping its frame',
  'body-font-size': 'Body text undersized',
  'nav-collapse': 'Broken mobile navigation',
};

export function severityLabel(severity) {
  if (severity === 'error') return 'Critical';
  if (severity === 'warn') return 'Warning';
  if (severity === 'info') return 'Needs review';
  return 'Info';
}

export function humanRuleName(rule) {
  return RULE_NAMES[rule] || String(rule || 'Issue').replace(/-/g, ' ');
}

/** Prefer landmark / region language over raw CSS selectors. */
export function componentLabel(selector = '', rule = '') {
  const s = String(selector || '').toLowerCase();
  if (/\bnav\b|navbar|menu|hamburger/.test(s)) return 'Main navigation';
  if (/\bheader\b|site-header/.test(s)) return 'Site header';
  if (/\bfooter\b/.test(s)) return 'Site footer';
  if (/checkout|cart|basket|buy|purchase/.test(s)) return 'Checkout controls';
  if (/contact|enquire|inquiry|lead|signup|subscribe/.test(s)) return 'Contact / lead form';
  if (/\bbutton\b|\.btn\b|cta/.test(s)) return 'Primary actions';
  if (/\bh1\b|\bh2\b|hero/.test(s)) return 'Hero / headings';
  if (rule === 'element-collision') return 'Overlapping UI region';
  if (rule === 'target-size-minimum') return 'Interactive controls';
  const short = String(selector || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  return short || 'Page component';
}

export function componentTitle(rule, selector) {
  return `${componentLabel(selector, rule)} — ${humanRuleName(rule)}`;
}

/** Translate a rule into lost-revenue / trust language for prospects. */
export function businessImpact(rule, severity = 'warn') {
  if (rule === 'target-size-minimum') {
    return 'Lost mobile conversions: shoppers struggle to tap checkout, contact, or menu controls on phones.';
  }
  if (rule === 'wcag-contrast') {
    return 'Trust and readability risk: low-contrast text is skipped on mobile and can exclude customers with low vision.';
  }
  if (String(rule || '').includes('overflow')) {
    return 'Broken first impression: content that slides off-screen signals an unfinished build and raises bounce risk.';
  }
  if (rule === 'element-collision') {
    return 'Mis-taps and rage clicks: overlapping controls send people to the wrong action or block the intended one.';
  }
  if (rule === 'nav-collapse') {
    return 'Mobile journeys stall: if navigation fails on small screens, most of the catalogue is unreachable.';
  }
  if (rule === 'media-bleed') {
    return 'Layout looks unpolished: escaping images distract from product and CTA focus.';
  }
  if (severity === 'info') {
    return 'Needs a human pass before it is treated as a confirmed failure.';
  }
  return 'Friction in the journey: this pattern adds avoidable drop-off before the prospect can convert.';
}
