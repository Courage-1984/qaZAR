---
name: tune-heuristic
description: Guide and procedure for tuning existing UX/UI heuristic rules to eliminate false positives on real websites.
---

# Tune Heuristic Rule

Use this skill when an existing heuristic rule produces false positives on legitimate modern web patterns (e.g. background images, fixed sticky headers, off-canvas drawers).

## Procedure

1. **Isolate the false-positive trigger**:
   - Inspect the flagged element: tag, class list, CSS properties (`position`, `overflow`, `background`, `display`, `opacity`).
   - Determine whether the rule should bypass the element or tag it with a lower severity / `indeterminate` status.

2. **Locate the rule logic**:
   - Open `server/heuristics/evaluate.js`.
   - Find the specific check block (e.g. `wcag-contrast`, `nav-not-collapsed`, `element-collision`, `media-bleed`).

3. **Apply the heuristic adjustment**:
   - Remember the invariant: `evaluate()` must remain 100% self-contained. All helper functions must stay inside `evaluate()`.
   - Do NOT introduce unbounded loops or expensive DOM queries across the whole page.
   - Maintain stable rule IDs: never rename existing rule keys unless deprecating them across UI and queue.

4. **Verify**:
   - Run syntax check: `node --check server/heuristics/evaluate.js`.
   - Run unit tests: `npm test`.
   - Run e2e smoke against the problematic target: follow `e2e-smoke` skill.
