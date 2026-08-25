#!/usr/bin/env node
// SessionStart hook: publish the plugin's rules/ to ~/.claude/modus/rules/ so
// project CLAUDE.md files can opt into house rules with one stable,
// machine-independent line each:  @~/.claude/modus/rules/<rule>.md
//
// ~/.claude/modus/rules/ is plugin-managed — never hand-edit it; edit the rule
// in the modus repo instead (rules removed upstream are pruned here).
// Silent, sub-millisecond, and never fails the session.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'rules');
  const dst = path.join(os.homedir(), '.claude', 'modus', 'rules');
  fs.mkdirSync(dst, { recursive: true });

  const shipped = new Set();
  for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.md'))) {
    shipped.add(f);
    const body = fs.readFileSync(path.join(src, f), 'utf8');
    const target = path.join(dst, f);
    let current = null;
    try {
      current = fs.readFileSync(target, 'utf8');
    } catch {}
    if (current !== body) fs.writeFileSync(target, body);
  }

  for (const f of fs.readdirSync(dst).filter((f) => f.endsWith('.md'))) {
    if (!shipped.has(f)) fs.unlinkSync(path.join(dst, f));
  }
} catch {
  // A sync problem must never break a session start.
}
process.exit(0);
