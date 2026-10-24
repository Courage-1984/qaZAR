---
name: add-heuristic-rule
description: Add or tune a UX/UI violation check in qaZAR's DOM evaluator (evaluate.js), including tests and docs. Use when asked to detect a new UX/UI/accessibility problem or reduce false positives of an existing rule.
---

# Add a heuristic rule

1. Read `.agents/rules/heuristics.md` and `server/heuristics/evaluate.js`.
2. Define: rule id (kebab-case), severity, viewport scope (all / touch only), threshold + standard reference.
3. Implement inside `evaluate()` (self-contained!). If it needs data from other viewports, return it in `metrics` and compare in `jobQueue.js#evaluateCrossViewport`.
4. Create/extend a local fixture page (planned location `server/test/fixtures/*.html`) containing one violating and one compliant example of the rule.
5. Verify in a real browser, not only unit tests:
   - Start API (`npm run server`, daemon) with `ALLOW_PRIVATE=1`, serve the fixture (`npx vite preview` or a static server), POST `/api/runs`, poll `/api/runs/:id`.
   - Confirm the rule fires on the violating element and NOT on the compliant one at the intended viewports.
6. Update the doc comment atop `evaluate.js`, the README heuristics list, and `AGENTS.md` "Known weak spots" if a limitation remains.
7. Run workflow `/verify`, then commit as `heuristics: <rule-id> …`.
