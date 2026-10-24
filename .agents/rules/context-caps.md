---
description: File length and context budget caps across code, agentic files, and documentation.
alwaysApply: true
---

# File Length & Context Budget Caps

To prevent context bloat, enforce separation of concerns, and keep reasoning fast and deterministic, strict line caps apply to all files in this repository:

1. **Code Files (`server/**/*.js`, `web/**/*.js`)**:
   - Hard Cap: **250 lines** (target < 150 lines).
   - If a module nears 250 lines, split helpers or extract sub-routers/services.
   - Exception: `server/heuristics/evaluate.js` must remain self-contained for `page.evaluate()` (capped at 400 lines).

2. **Agentic Context & Configuration Files**:
   - `AGENTS.md`: Strict **150 lines** cap (enforced by universal protocol).
   - `.agents/rules/*.md`: **100 lines** cap.
   - `.claude/agents/*.md` & `.cursor/rules/*.mdc`: **80 lines** cap.
   - Skills (`SKILL.md`) & Prompts: **120 lines** cap.
   - Workflows (`.agents/workflows/*.md`): **50 lines** cap.

3. **Documentation Files (`README.md`, `TODOS.md`, `docs/*.md`)**:
   - Hard Cap: **200 lines** per document.
   - Split extensive topics into dedicated files under `docs/` (e.g. `docs/architecture.md`, `docs/deployment.md`, `docs/api.md`).
