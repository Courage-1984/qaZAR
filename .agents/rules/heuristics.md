---
trigger: model_decision
description: Apply when editing server/heuristics/evaluate.js, adding or tuning a UX/UI violation rule, or changing severity/thresholds.
---

# Heuristics rules

- `evaluate()` runs inside the page via `page.evaluate` → **self-contained**: no imports, no module-level helpers, no references to Node APIs. Declare helpers inside the function body.
- Add a rule by: (1) implement block with a comment header `// --- N. Name ---`, (2) emit via `add(rule, severity, el, detail)`, (3) update the rule list in the file's top doc comment, (4) mention it in README "Active UX/UI Heuristic Evaluator", (5) add fixture/test evidence.
- Rule IDs are kebab-case and **stable** once shipped (`touch-target-size`, `wcag-contrast`, …). Rename = breaking change.
- Severity: `error` = objective standard violation (WCAG AA, overflow, <48px target); `warn` = heuristic/approximate; `info` = advisory.
- Thresholds: touch 48x48 (touch viewports only), body text >= 16px, contrast 4.5:1 (3:1 large: >=24px or >=18.66px bold), collision overlap > 12px both axes.
- Prefer false negatives over noisy false positives: skip hidden, `position:fixed` overlays, ancestor/descendant pairs, background-image text (indeterminate).
- Cap work: sample sizes and `MAX_PER_RULE` exist to bound runtime on huge DOMs; keep per-evaluation cost O(n log n) or sampled.
- Cross-viewport comparisons belong in `jobQueue.js#evaluateCrossViewport`, using `metrics` returned by `evaluate()`.
