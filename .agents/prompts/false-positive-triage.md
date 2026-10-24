# Prompt template: heuristic false-positive triage

Context: qaZAR flagged violations on a real site and some look wrong.

Input: run id `<RUN_ID>` (data in `data/runs/<RUN_ID>/run.json`).

Task:
1. Group violations by `rule` and count them; list the 5 noisiest selectors per rule.
2. For each noisy rule, state whether it is a true positive, a false positive, or indeterminate, with the DOM/CSS reason.
3. Propose the smallest change to `server/heuristics/evaluate.js` that removes the false positives without hiding true ones (follow `.agents/rules/heuristics.md`).
4. Do NOT implement until the proposal is approved; then use skill `add-heuristic-rule`.
