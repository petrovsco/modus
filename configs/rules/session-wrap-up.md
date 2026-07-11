# Rule: Session context wrap-up

**Type:** CLAUDE.md snippet (paste into the project's CLAUDE.md).
**Pairs with:** the `context-guard-hook` (which triggers it automatically) and the
`roadmap-command` (which is where the remaining scope lands).

---

## Session context wrap-up

Sessions should not run the context window far past **~200k tokens** — beyond that
they get slow and expensive, and starting a fresh session mid-feature risks
re-deriving work or leaving the repo broken. To avoid that, follow this protocol.

**Work in atomic units.** Structure work so that each unit is independently
build-passing and commit-able. Checkpoint after every unit: build → commit → push.
This is the real safety guarantee — because we checkpoint continuously, stopping at
any point leaves a clean, working tree.

**The wrap-up trigger.** A `PostToolUse` hook (`.claude/hooks/context-guard.mjs`)
watches context-window occupancy and injects a wrap-up instruction at a soft
threshold (~180k, tier 1) and a hard one (~195k, tier 2). The user may also just
say "wrap up." When the signal arrives:

1. **Finish only the atomic unit already in progress. Start nothing new.** 200k is
   a *soft* target — if finishing the current unit needs 210k, finish it. Never
   stop mid-feature to hit the number; a broken tree is the thing we are avoiding.
2. **Checkpoint it**: build (must pass), then commit and push.
3. **Hand off the remainder.** Write the remaining scope as a kickoff-ready brief
   in `docs/roadmap/` (one file per item; the slug/filename is its ID). Include
   what's done, where it left off, and what's next, so a fresh session resumes
   cheaply.
4. **Report the roadmap item's ID** to the user so they can run it in a new session
   (e.g. `/roadmap <id>`).

**Tuning / disabling the guard.** Thresholds are env-overridable (`CTX_GUARD_SOFT`,
`CTX_GUARD_HARD`). The guard is local code (zero model tokens), reads only the tail
of the transcript, and de-bounces to warn at most once per tier per session. Review
or disable it via `/hooks`.
