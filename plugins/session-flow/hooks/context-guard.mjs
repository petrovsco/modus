#!/usr/bin/env node
// Context guard — one script, three hook events, zero model tokens.
//
// Reads the live session transcript, computes current context-window
// occupancy from the newest assistant turn's `usage`, and acts by event:
//
//   PostToolUse  — user-facing only. Past the soft/hard threshold it prints a
//                  one-line warning to the terminal (systemMessage), once per
//                  tier per cycle. Nothing is injected into the model's
//                  context: the tokens are already spent, and interrupting a
//                  unit mid-way is exactly what the wrap-up protocol avoids.
//   Stop         — model-facing, once per cycle. When the model is about to end
//                  its turn above the soft threshold, block the stop once and
//                  hand it the wrap-up protocol: checkpoint, statuses, hand-off
//                  brief, report the ID and the context figure. Never blocks
//                  twice in a row (stop_hook_active).
//   SessionStart — matcher "compact". After an auto-compaction the guard
//                  re-arms (a new cycle starts) and the model gets one line
//                  asking it to confirm the tree, statuses and brief reflect
//                  where it is.
//
// A "cycle" ends when occupancy drops back below the soft threshold — which is
// what compaction does — so the guard fires once per cycle, not once per
// session.
//
// Costs zero model tokens: local code, a tail read of the transcript and some
// arithmetic. Sub-millisecond.
//
// Tunable via env:
//   CTX_GUARD_WINDOW       (default 200000) — the model's context window;
//                          set 1000000 for [1m] models
//   CTX_GUARD_SOFT         (default 90% of window)   — tier-1 threshold
//   CTX_GUARD_HARD         (default 97.5% of window) — tier-2 threshold
//   CTX_GUARD_ROADMAP_DIR  (default 'docs/roadmap/') — where remaining scope goes

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WINDOW = Number(process.env.CTX_GUARD_WINDOW || 200000);
const SOFT = Number(process.env.CTX_GUARD_SOFT || Math.round(WINDOW * 0.9));
const HARD = Number(process.env.CTX_GUARD_HARD || Math.round(WINDOW * 0.975));
const ROADMAP_DIR = process.env.CTX_GUARD_ROADMAP_DIR || 'docs/roadmap/';
const TAIL_BYTES = 5 * 1024 * 1024; // enough to span the last few turns

const k = (n) => (n >= 1e6 ? `~${(n / 1e6).toFixed(1)}M` : `~${Math.round(n / 1000)}k`);

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Read only the last `maxBytes` of a file (honours "read the tail, not the
// whole session"). The caller falls back to a full read if nothing is found.
function tailRead(file, maxBytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const { size } = fs.fstatSync(fd);
    const len = Math.min(maxBytes, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

// Scan lines from the end; return context occupancy of the newest assistant
// turn that carries a usage object.
function latestContextTokens(text) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || line[0] !== '{') continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // partial first line from a tail read, or non-JSON
    }
    const u = obj?.message?.usage || obj?.usage;
    if (u && (u.input_tokens != null || u.cache_read_input_tokens != null)) {
      return (
        (u.input_tokens || 0) +
        (u.cache_read_input_tokens || 0) +
        (u.cache_creation_input_tokens || 0)
      );
    }
  }
  return null;
}

function contextTokens(transcript) {
  if (!transcript || !fs.existsSync(transcript)) return null;
  try {
    const ctx = latestContextTokens(tailRead(transcript, TAIL_BYTES));
    return ctx ?? latestContextTokens(fs.readFileSync(transcript, 'utf8'));
  } catch {
    return null;
  }
}

const tierOf = (ctx) => (ctx >= HARD ? 2 : ctx >= SOFT ? 1 : 0);

// Per-session state for the current cycle: { tier, wrapped }.
// The session id lands in a tmp file path, so it may only contain characters
// that cannot walk out of the directory.
function stateFileFor(sessionId) {
  const id =
    String(sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'unknown';
  return path.join(os.tmpdir(), `claude-ctxguard-${id}.json`);
}
function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
  } catch {
    return {};
  }
}
function writeState(file, state) {
  try {
    fs.writeFileSync(file, JSON.stringify(state));
  } catch {}
}
// Occupancy fell below the soft threshold: the cycle is over, re-arm.
function reArm(file, state) {
  if (state.tier || state.wrapped) writeState(file, {});
}

const emit = (obj) => process.stdout.write(JSON.stringify(obj));

function onPostToolUse(ctx, state, file) {
  const tier = tierOf(ctx);
  if (tier === 0) return reArm(file, state);
  if (tier <= (state.tier || 0)) return; // already said so this cycle
  writeState(file, { ...state, tier });
  const where =
    tier === 2 ? `past the ${k(HARD)} hard target` : `past the ${k(SOFT)} soft limit`;
  const next = state.wrapped
    ? 'The wrap-up was already requested this cycle; compaction is close.'
    : 'Claude will be asked to wrap up when this turn ends.';
  emit({
    systemMessage: `Context guard: ${k(ctx)} of a ${k(WINDOW)} window, ${where}. ${next}`,
  });
}

function onStop(input, ctx, state, file) {
  if (input.stop_hook_active) return; // we already asked this turn — let it stop
  const tier = tierOf(ctx);
  if (tier === 0) return reArm(file, state);
  if (state.wrapped) return; // once per cycle
  writeState(file, { tier: Math.max(tier, state.tier || 0), wrapped: true });
  const where =
    tier === 2 ? `past the ${k(HARD)} hard target` : `past the ${k(SOFT)} soft limit`;
  const reason = [
    `Context guard: this session is at ${k(ctx)} of a ${k(WINDOW)} window, ${where}. Before you stop, run the wrap-up protocol from the "Session context wrap-up" rule. Start no new work.`,
    `1. If the unit you were working on is complete, checkpoint it: run the project's build, then commit and push. If it is incomplete, do not force a commit — record where it stands in the hand-off brief instead.`,
    `2. Leave the statuses true: update the **Status:** line of every brief this session moved (worked on, blocked, unblocked, finished or dropped).`,
    `3. If scope remains, write it as a kickoff-ready brief under ${ROADMAP_DIR} with the next free ID (highest number across ${ROADMAP_DIR} and its done/ folder, plus one): what is done, where it left off, what is next.`,
    `4. Commit and push the bookkeeping too.`,
    `5. Tell the user the brief's ID (if any) and that context is at ${k(ctx)}, so they can choose to compact, continue, or start a fresh session.`,
    `If all of this is already in place, say so in one line and stop.`,
  ].join('\n');
  emit({
    decision: 'block',
    reason,
    systemMessage: `Context guard: ${k(ctx)} of ${k(WINDOW)} — asking Claude to wrap up before it stops.`,
  });
}

function onSessionStart(input, file) {
  if (input.source !== 'compact') return;
  writeState(file, {}); // new cycle
  emit({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `Context guard: the context was just compacted, so the summary may have lost detail. Before continuing, check that the working tree is clean (git status), that the **Status:** lines of the briefs this session touched are true, and that any remaining scope is written as a brief under ${ROADMAP_DIR}. If all of that already holds, carry on with the task.`,
    },
  });
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    return; // no/invalid stdin — nothing to do
  }
  const file = stateFileFor(input.session_id);
  const event = input.hook_event_name;

  if (event === 'SessionStart') return onSessionStart(input, file);

  const ctx = contextTokens(input.transcript_path);
  if (ctx == null) return;
  const state = readState(file);
  if (event === 'Stop') return onStop(input, ctx, state, file);
  if (event === 'PostToolUse') return onPostToolUse(ctx, state, file);
}

try {
  main();
} catch {
  // Never let the guard break a hook.
}
process.exit(0);
