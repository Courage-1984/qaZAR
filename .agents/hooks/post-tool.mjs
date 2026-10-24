#!/usr/bin/env node
/**
 * Shared PostToolUse hook for qaZAR.
 * Runs fast static assertions after tool execution to detect broken invariants early.
 * Stdin: JSON payload from agent platform. Stdout: {}
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

try {
  // 1. Invariant check: viewports.js exact 7 viewports
  const vpPath = resolve(ROOT, 'server/engine/viewports.js');
  if (existsSync(vpPath)) {
    const vpCode = readFileSync(vpPath, 'utf8');
    const expected = ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile'];
    for (const name of expected) {
      if (!vpCode.includes(`name: '${name}'`) && !vpCode.includes(`name: "${name}"`)) {
        console.error(`[qaZAR Invariant Warning]: Viewport '${name}' missing from server/engine/viewports.js`);
      }
    }
  }

  // 2. Invariant check: evaluate.js must not contain top-level imports inside evaluate()
  const evalPath = resolve(ROOT, 'server/heuristics/evaluate.js');
  if (existsSync(evalPath)) {
    const evalCode = readFileSync(evalPath, 'utf8');
    const fnStart = evalCode.indexOf('export function evaluate(');
    if (fnStart !== -1) {
      const fnBody = evalCode.slice(fnStart);
      if (/\bimport\s+/.test(fnBody) || /\brequire\s*\(/.test(fnBody)) {
        console.error('[qaZAR Invariant Warning]: evaluate() inside evaluate.js contains import/require calls! It must be self-contained for page.evaluate().');
      }
    }

    // 3. Context cap check: evaluate.js <= 400 lines
    const lines = evalCode.split('\n').length;
    if (lines > 400) console.error(`[qaZAR Cap Warning]: evaluate.js has ${lines} lines (cap: 400).`);
  }
} catch {
  // Silent fail to avoid disrupting tool workflow
}

console.log('{}');
