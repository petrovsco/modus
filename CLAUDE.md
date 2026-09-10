# CLAUDE.md

Guidance for Claude Code working in this repo.

## House rules

@~/.claude/modus/rules/rfc-convention.md
@~/.claude/modus/rules/no-personal-context.md

*(These are this repo's own product, synced to `~/.claude/modus/rules/` at
session start. Editing a rule here changes it for every repo that imports it,
next session.)*

## What this repo is

The plugin marketplace: `plugins/` holds the plugins, `configs/` the templates
they install, `tools/` the local utilities, `catalog.json` the source of truth
for `/modus:init`.

## Where the specifications live

**`petrovsco/modus.rfcs`**, cloned as a sibling at `Projects/modus.rfcs`. This
repo holds code; what we intend to build next lives there, one numbered RFC per
unit of work. Work that changes both the plan and the code is committed in
both, in the same session, neither one left dirty.
