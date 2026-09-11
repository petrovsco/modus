# CLAUDE.md

Guidance for Claude Code working in this repo.

## House rules

The rules in [`.claude/rules/modus/`](.claude/rules/modus/) are copies of this
repo's own product, refreshed at session start by the `sync-rules` hook. Editing a
rule in `plugins/modus/rules/` changes it for every repo carrying a copy, at that
repo's next session.

## What this repo is

The plugin marketplace: `plugins/` holds the plugins, `configs/` the templates
they install, `tools/` the local utilities, `catalog.json` the source of truth
for `/modus:init`.

## Where the specifications live

**`petrovsco/modus.rfcs`**, cloned as a sibling at `Projects/modus.rfcs`. This
repo holds code; what we intend to build next lives there, one numbered RFC per
unit of work. Work that changes both the plan and the code is committed in
both, in the same session, neither one left dirty.
