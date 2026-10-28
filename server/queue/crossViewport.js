function inverted(level, deviceLabel, devicePx, deskPx) {
  const tag = level.toUpperCase();
  return {
    rule: 'heading-scale-inverted',
    severity: 'info',
    selector: level,
    rect: null,
    detail: `${deviceLabel} ${tag} (${devicePx}px) exceeds desktop ${tag} (${deskPx}px) indicating breakpoint style inversion`,
  };
}

function staticScale(level, mobPx, deskPx) {
  return {
    rule: 'heading-scale-static',
    severity: 'info',
    selector: level,
    rect: null,
    detail: `${level.toUpperCase()} size (${mobPx}px) does not scale down on mobile (390px) from desktop (${deskPx}px)`,
  };
}

function undersized(mobH1, mobBody) {
  return {
    rule: 'heading-scale-undersized',
    severity: 'info',
    selector: 'h1',
    rect: null,
    detail: `H1 size (${mobH1}px) is less than or equal to base body font (${mobBody}px) on mobile`,
  };
}

/**
 * Pure heading-scale checks across desktop / tablet / mobile metrics.
 * Thresholds match the historical evaluateCrossViewport behaviour.
 */
export function crossViewportViolations({
  deskH1, deskH2, tabH1, mobH1, mobH2, mobBody = 16,
} = {}) {
  const tablet = [];
  const mobile = [];

  if (tabH1 && deskH1 && tabH1 > deskH1 + 4) {
    tablet.push(inverted('h1', 'Tablet', tabH1, deskH1));
  }

  if (deskH1 && mobH1) {
    if (mobH1 > deskH1 + 4) {
      mobile.push(inverted('h1', 'Mobile', mobH1, deskH1));
    } else if (deskH1 > 28 && mobH1 >= deskH1) {
      mobile.push(staticScale('h1', mobH1, deskH1));
    }
    if (mobH1 <= mobBody) {
      mobile.push(undersized(mobH1, mobBody));
    }
  }

  if (deskH2 && mobH2 && deskH2 > 24 && mobH2 >= deskH2) {
    mobile.push(staticScale('h2', mobH2, deskH2));
  }

  return { tablet, mobile };
}
