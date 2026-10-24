@AGENTS.md

## Claude Code specifics
- Subagents live in `.claude/agents/`; skills in `.claude/skills/` (thin pointers to `.agents/skills/`).
- Shared safety hook: `.agents/hooks/guard.mjs` (wired in `.claude/settings.json`).
- Local-only overrides go in `.claude/settings.local.json` (gitignored).
