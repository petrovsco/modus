#!/usr/bin/env node
// SessionStart hook: keep every copy of a house rule identical to the one in
// the modus repo. Two targets.
//
// 1. <project>/.claude/rules/modus/*.md — the copies that travel with the repo.
//    Claude Code loads .claude/rules/ from the checkout itself, so these reach
//    every reader: a cloud session, a collaborator, a machine without the
//    plugin. Refreshed here, never created here — the file's existence IS the
//    repo's opt-in, and /modus:init is what adds or removes one. A rule retired
//    upstream is not deleted silently: its body is replaced by a two-line note
//    so a person sees it and removes the file.
//
// 2. ~/.claude/modus/rules/ — the old publish target for the
//    @~/.claude/modus/rules/<rule>.md import lines. Kept for one release, for
//    repos not migrated yet, then dropped.
//
// Silent, sub-millisecond, and never fails the session.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANAGED = '<!-- managed by modus — edit the rule in the modus repo, not here -->';
const RETIRED = '<!-- retired upstream: this rule is no longer part of modus. Delete this file. -->';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'rules');

let shipped = [];
try {
  shipped = fs.readdirSync(src).filter((f) => f.endsWith('.md'));
} catch {
  // No rules to sync from — leave every existing copy untouched.
  process.exit(0);
}

const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};

const writeIfChanged = (target, body) => {
  if (read(target) !== body) fs.writeFileSync(target, body);
};

// 1. The in-repo copies: refresh what is there, add nothing.
try {
  const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dst = path.join(project, '.claude', 'rules', 'modus');
  for (const f of fs.readdirSync(dst).filter((f) => f.endsWith('.md'))) {
    const body = shipped.includes(f) ? read(path.join(src, f)) : null;
    writeIfChanged(
      path.join(dst, f),
      body === null ? `${MANAGED}\n${RETIRED}\n` : `${MANAGED}\n\n${body}`,
    );
  }
} catch {
  // No .claude/rules/modus/ here: this repo has opted into no rule. Nothing to do.
}

// 2. The legacy home-directory publish, for repos still on import lines.
try {
  const dst = path.join(os.homedir(), '.claude', 'modus', 'rules');
  fs.mkdirSync(dst, { recursive: true });
  for (const f of shipped) {
    const body = read(path.join(src, f));
    if (body !== null) writeIfChanged(path.join(dst, f), body);
  }
  for (const f of fs.readdirSync(dst).filter((f) => f.endsWith('.md'))) {
    if (!shipped.includes(f)) fs.unlinkSync(path.join(dst, f));
  }
} catch {
  // A sync problem must never break a session start.
}

process.exit(0);
