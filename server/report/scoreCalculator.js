/**
 * Calculates executive UX/UI Health Scores and business impact metrics
 * for client-facing audit reports and lead generation.
 */

export function calculateHealthScore(run) {
  const s = run.summary || { violations: { error: 0, warn: 0 }, changed: 0 };
  let score = 100;

  // Deduct for violations
  const errorCount = s.violations.error || 0;
  const warnCount = s.violations.warn || 0;
  const visualChanges = s.changed || 0;

  score -= errorCount * 4;
  score -= warnCount * 1.5;
  score -= visualChanges * 2;

  // Clamp between 15 and 100
  const finalScore = Math.max(15, Math.min(100, Math.round(score)));

  let grade = 'F';
  let status = 'Critical UX Debt';
  let recommendation = 'Comprehensive Site Rebuild Recommended';

  if (finalScore >= 90) {
    grade = 'A';
    status = 'Optimal Health';
    recommendation = 'Minor Cosmetic Polish';
  } else if (finalScore >= 80) {
    grade = 'B';
    status = 'Good Responsive Baseline';
    recommendation = 'Targeted Mobile & Accessibility Remediation';
  } else if (finalScore >= 70) {
    grade = 'C';
    status = 'Moderate UX Friction';
    recommendation = 'UX Overhaul for High-Conversion Flows';
  } else if (finalScore >= 60) {
    grade = 'D';
    status = 'Significant Revenue Leakage';
    recommendation = 'Major Responsive Refactor & Architecture Overhaul';
  }

  // Calculate category risks
  const categories = {
    mobileTouch: 0,
    overflowBreakage: 0,
    wcagContrast: 0,
    typography: 0,
    collisions: 0,
  };

  for (const page of run.pages || []) {
    for (const rec of Object.values(page.viewports || {})) {
      for (const v of rec.violations || []) {
        if (v.rule.includes('touch')) categories.mobileTouch++;
        else if (v.rule.includes('overflow')) categories.overflowBreakage++;
        else if (v.rule.includes('contrast')) categories.wcagContrast++;
        else if (v.rule.includes('heading') || v.rule.includes('font')) categories.typography++;
        else if (v.rule.includes('collision')) categories.collisions++;
      }
    }
  }

  return {
    score: finalScore,
    grade,
    status,
    recommendation,
    metrics: {
      totalPages: run.pages?.length || 0,
      totalCaptures: (run.pages?.length || 0) * 7,
      errors: errorCount,
      warnings: warnCount,
      visualChanges,
      categories,
    },
  };
}
