# Releases

The release registry for this repo (furniture — no `NNN-` prefix, never a
task). One `##` section per release; the heading text is the release name,
exactly as briefs spell it in their `**Release:**` line.

Plugin releases are named `<plugin> x.y.0` (e.g. `session-flow 1.3.0`).
Day-to-day edits only bump a plugin's patch digit; a minor lands here first —
declared, scoped by briefs, and bumped only when it ships. See README →
"Changing things".

## session-flow 1.3.0

**Target:** 2026-09-04
**Status:** released 2026-09-04

The context guard stops interrupting work mid-run: it warns the user past the
soft threshold, asks the model to wrap up once when it is about to stop, and
re-arms after each auto-compaction. Scope: task 2.

## session-flow 1.4.0

**Target:** 2026-09-20
**Status:** planned

The roadmap convention becomes the RFC convention. `/roadmap` stops reading
`docs/roadmap/` inside the code repo and reads the project's `<project>.rfcs`
specification repository instead: numbered RFCs in `rfcs/`, YAML frontmatter in
place of bold header lines, four-digit IDs, `done/` unchanged. The old layout
stays readable so an unmigrated project keeps working. Scope: task 6.
