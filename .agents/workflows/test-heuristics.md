---
description: Verify UX/UI heuristic evaluator integrity, self-containment, and test suite.
---

1. Run syntax verification on the evaluator:
   ```bash
   node --check server/heuristics/evaluate.js
   ```
2. Confirm self-containment invariant:
   - Ensure `evaluate()` contains no top-level `import`, `require`, or external module dependencies.
   - All helper functions (`selectorOf`, `visible`, `luminance`, `contrastRatio`) must reside inside the closure.
3. Run the unit test suite:
   ```bash
   npm test
   ```
4. If testing against a live target or fixture, run skill `e2e-smoke` to verify no runtime closure serialization exceptions occur in Playwright.
