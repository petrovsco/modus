## Session context wrap-up

Sessions should not run the context window far past **~200k tokens** — beyond that
they get slow and expensive, and starting a fresh session mid-feature risks
re-deriving work or leaving the repo broken. To avoid that, follow this protocol.

**Work in atomic units.** Structure work so that each unit is independently
build-passing and commit-able. Checkpoint after every unit: run the project's
build → commit → push. This is the real safety guarantee — because we checkpoint
continuously, stopping at any point leaves a clean, working tree.

**The wrap-up trigger.** The session-flow context guard watches context-window
occupancy and injects a wrap-up instruction at a soft threshold (~180k) and a
hard one (~195k). The user may also just say "wrap up." When the signal arrives:

1. **Finish only the atomic unit already in progress. Start nothing new.** 200k
   is a *soft* target — if finishing the current unit needs 210k, finish it.
   Never stop mid-feature to hit the number; a broken tree is the thing we are
   avoiding.
2. **Checkpoint it**: run the project's full build (must pass), then commit and
   push per the repo's convention.
3. **Hand off the remainder.** Write the remaining scope as a kickoff-ready
   brief in `docs/roadmap/`, one file per item, named `NNN-<slug>.md`. Allocate
   the next free ID: the highest number across `docs/roadmap/` and
   `docs/roadmap/done/`, plus one. Include what's done, where it left off, and
   what's next, so a fresh session resumes cheaply.
4. **Report the roadmap item's ID** to the user so they can run it in a new
   session (e.g. `/roadmap 7`). That number is permanent — it stays with the
   brief through renames and through the move into `done/`.

Thresholds are env-overridable (`CTX_GUARD_SOFT`, `CTX_GUARD_HARD`); review or
disable the guard via `/hooks`.
