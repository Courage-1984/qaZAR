#!/usr/bin/env node
/**
 * Shared PreToolUse safety guard for Antigravity (.agents/hooks.json) and
 * Claude Code (.claude/settings.json). Blocks destructive / repo-damaging shell commands.
 * - Antigravity payload: { toolCall: { args: { CommandLine } } }  -> stdout JSON
 * - Claude payload:      { tool_input: { command } }              -> stderr + exit 2 to block
 */
import { readFileSync } from 'node:fs';

const RULES = [
  [/git\s+push\b[^\n]*(--force\b|--force-with-lease|\s-f\b)/i, 'Force-push is not allowed.'],
  [/git\s+reset\s+--hard/i, 'git reset --hard can destroy uncommitted work; ask the user first.'],
  [/git\s+clean\s+-[a-z]*f/i, 'git clean -f deletes untracked files; ask the user first.'],
  [/git\s+(add|commit)\b[^\n]*(--no-verify|\s-f\b|--force)/i, 'Forced add / --no-verify is not allowed.'],
  [/git\s+add\b[^\n]*(\.env\b|settings\.local\.json|(^|[\s/])data(\/|\s|$))/i, 'Do not stage .env, settings.local.json or data/.'],
  [/(^|[\s;&|])rm\s+-[a-z]*r[a-z]*\s+(\/|~|\*|\.git\b|\.\s*$)/i, 'Recursive rm on root/home/.git/cwd is blocked.'],
  [/Remove-Item\b[^\n]*-Recurse[^\n]*(\.git\b|[A-Za-z]:\\?\s*$|\\\*|\s\.\s*$)/i, 'Recursive Remove-Item on .git/drive/cwd is blocked.'],
  [/(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*\|\s*(sh|bash|iex|Invoke-Expression)/i, 'Piping downloads into a shell is blocked.'],
  [/npm\s+publish/i, 'qaZAR is a private project; npm publish is blocked.'],
  [/git\s+branch\s+-[dD]\s+(main|master)\b/i, 'Deleting main/master branch is blocked.'],
  [/git\s+checkout\s+-[fF]\b/i, 'Forced checkout (-f) can discard uncommitted work.'],
  [/git\s+add\b[^\n]*\.(png|jpg|jpeg|webp|mp4|mov|zip|tar|gz)\b/i, 'Do not stage media/screenshot binaries directly into git.'],
];

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  /* malformed input -> do not block */
}

const claude = !!payload.tool_input;
const cmd = String(payload.toolCall?.args?.CommandLine ?? payload.tool_input?.command ?? '');
const hit = RULES.find(([re]) => re.test(cmd));

if (hit) {
  const reason = `qaZAR guard: ${hit[1]}`;
  if (claude) {
    console.error(reason);
    process.exit(2);
  }
  console.log(JSON.stringify({ decision: 'deny', reason }));
} else {
  console.log(claude ? '' : JSON.stringify({ decision: 'allow' }));
}
