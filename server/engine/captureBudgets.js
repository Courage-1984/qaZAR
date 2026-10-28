/** Capture timing budgets and screenshot clip helpers. */

export const FREEZE_CSS = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';

export const LEAD_HTML_CAP = 1_500_000;

/** Scroll and font-wait budgets for normal vs fast captures. */
export function captureBudgets(fast = false) {
  return {
    scrollBudgetMs: fast ? 1200 : 2500,
    fontCapMs: fast ? 800 : 1500,
    settleMs: fast ? 0 : 50,
  };
}

/** Full-page shot, or clip when the page exceeds maxShotHeight. */
export function screenshotOptions(outFile, { height, width, maxShotHeight }) {
  const opts = {
    path: outFile,
    fullPage: true,
    animations: 'disabled',
  };
  if (height > maxShotHeight) {
    opts.clip = { x: 0, y: 0, width, height: maxShotHeight };
  }
  return opts;
}
