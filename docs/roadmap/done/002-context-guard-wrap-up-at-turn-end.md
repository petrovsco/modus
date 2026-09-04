# Roadmap: Context guard — wrap up at turn end, not mid-run

**Label:** infra
**Status:** done — shipped as session-flow 1.3.0 on 2026-09-04 (commit 16ae258); installed on WSL and Windows for all four consumers
**Release:** session-flow 1.3.0
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-04, from the question whether interrupting an active run at ~180k is pointless now that Claude Code compacts instead of ending the session.

## Goal

The guard stops interrupting work mid-run. The tokens it "saves" are already
spent when it fires, auto-compaction means the session survives anyway, and the
interrupt lands at a random tool call inside a unit. What the guard actually
protects is the hand-off — clean tree, true statuses, a brief for the remaining
scope — and that does not need an interruption, only a guarantee that it
happens before the boundary.

## Approach

One script (`plugins/session-flow/hooks/context-guard.mjs`), dispatching on the
hook event:

- **PostToolUse** — user-facing only: a terminal warning past the soft/hard
  threshold, once per tier per cycle. Nothing injected into the model.
- **Stop** — model-facing, once per cycle: above the soft threshold, block the
  stop once and hand the model the wrap-up protocol. `stop_hook_active` keeps it
  from blocking twice in a row.
- **SessionStart (compact)** — re-arm the guard and ask the model to confirm
  the tree, statuses and brief reflect where it is. PreCompact cannot inject
  context, so the post side is the only one available.

Two defects fixed on the way: the debounce never reset after compaction (the
guard fired once per session, not once per cycle), and the 180k/195k thresholds
assumed a 200k window (18% on a `[1m]` model). Thresholds are now 90% / 97.5% of
`CTX_GUARD_WINDOW`.

## Acceptance

- [x] PostToolUse emits a user-visible `systemMessage` only; no `additionalContext`
- [x] Stop blocks once per cycle above the soft threshold with the protocol as reason; silent when `stop_hook_active`
- [x] SessionStart with `source: compact` resets the state and injects the confirm-hand-off line; other sources are ignored
- [x] The state re-arms when occupancy drops below the soft threshold
- [x] `CTX_GUARD_WINDOW` sets the window; soft/hard default to 90% / 97.5% of it; absolute overrides still work
- [x] session-wrap-up rule, README, catalog and plugin description say what the guard now does
- [x] session-flow 1.3.0 installed on WSL and Windows for every consumer (tekio, bubolazi-workspace, lumi-workspace, feya-workspace/feyabuild); modus 1.3.2 too
