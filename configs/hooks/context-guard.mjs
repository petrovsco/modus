#!/usr/bin/env node
// Context guard (PostToolUse hook) — portable version.
//
// Reads the live session transcript, computes current context-window
// occupancy from the most recent assistant turn's `usage`, and — only when
// occupancy crosses a threshold — injects a "wrap-up" instruction back into
// the model's context. Stays completely silent below the threshold and
// de-bounces so it speaks at most once per tier per session.
//
// Costs zero model tokens: this is local code, not an inference call. It reads
// only the tail of the transcript (not the whole session) and one `usage`
// object, so it is a sub-millisecond file read plus arithmetic.
//
// Tunable via env:
//   CTX_GUARD_SOFT         (default 180000) — tier-1 threshold
//   CTX_GUARD_HARD         (default 195000) — tier-2 threshold
//   CTX_GUARD_ROADMAP_DIR  (default 'docs/roadmap/') — where remaining scope goes

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SOFT = Number(process.env.CTX_GUARD_SOFT || 180000);
const HARD = Number(process.env.CTX_GUARD_HARD || 195000);
const ROADMAP_DIR = process.env.CTX_GUARD_ROADMAP_DIR || 'docs/roadmap/';
const TAIL_BYTES = 5 * 1024 * 1024; // enough to span the last few turns

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Read only the last `maxBytes` of a file (honours "read the tail, not the
// whole session"). Falls back to a full read only if nothing is found.
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

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    return; // no/invalid stdin — nothing to do
  }

  const transcript = input.transcript_path;
  // The session id lands in a tmp file path below, so it may only contain
  // characters that cannot walk out of the directory.
  const sessionId =
    String(input.session_id || 'unknown').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'unknown';
  if (!transcript || !fs.existsSync(transcript)) return;

  let ctx = null;
  try {
    ctx = latestContextTokens(tailRead(transcript, TAIL_BYTES));
    if (ctx == null) ctx = latestContextTokens(fs.readFileSync(transcript, 'utf8'));
  } catch {
    return;
  }
  if (ctx == null) return;

  const tier = ctx >= HARD ? 2 : ctx >= SOFT ? 1 : 0;
  if (tier === 0) return;

  // De-bounce: only speak when entering a higher tier than last time.
  const stateFile = path.join(os.tmpdir(), `claude-ctxguard-${sessionId}.json`);
  let lastTier = 0;
  try {
    lastTier = JSON.parse(fs.readFileSync(stateFile, 'utf8')).tier || 0;
  } catch {}
  if (tier <= lastTier) return;
  try {
    fs.writeFileSync(stateFile, JSON.stringify({ tier, ctx }));
  } catch {}

  const k = Math.round(ctx / 1000);
  const additionalContext =
    tier === 2
      ? `Context is ~${k}k tokens — past the ~195k hard target. Do NOT start anything new. Finish ONLY the atomic unit already in progress, then run the wrap-up protocol in CLAUDE.md: build, commit, push, then move all remaining scope to a roadmap item under ${ROADMAP_DIR} and tell the user its ID.`
      : `Context is ~${k}k tokens — approaching the ~180k soft limit. Enter wrap-up mode per the "Session context wrap-up" protocol in CLAUDE.md: finish only the atomic unit currently in progress (start no new work), then build + commit + push it, then capture the remaining scope as a roadmap item under ${ROADMAP_DIR} and report its ID to the user so a fresh session can resume cleanly.`;

  process.stdout.write(
    JSON.stringify({
      systemMessage: `Context guard: ~${k}k tokens — entering wrap-up mode`,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext,
      },
    }),
  );
}

try {
  main();
} catch {
  // Never let the guard break a tool call.
}
process.exit(0);
