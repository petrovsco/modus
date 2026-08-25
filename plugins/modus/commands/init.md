---
description: Set up the current repo from the modus catalog (plugins, house rules, settings) via an interactive checklist
argument-hint: [optional: filter, e.g. "rules" or a specific config id]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

You are running the **modus** repo initializer. Goal: walk the user through
picking configs from the catalog and wiring the chosen ones into *this* repo.
In the plugin-first model you mostly **enable and reference** — you copy files
only for the few catalog categories that plugins cannot carry.

## 0. Locate the modus repo

The clone lives at `~/Projects/modus` (on this machine:
`~/Projects/modus`). If missing, ask where it was cloned. Read
`<modus>/catalog.json` — the source of truth for the checklist. Never guess
entries; only offer what's in the catalog.

## 1. Sniff the current project

Read-only reconnaissance before recommending anything:

- Git repo? Solo or shared (remotes, branch-protection signals)?
- Stack markers: `package.json`, `.mcp.json`, `supabase/`, framework hints,
  existing `.claude/` dir, existing `CLAUDE.md`.
- Already installed: `enabledPlugins` in `.claude/settings.json` /
  `.claude/settings.local.json`, existing `@~/.claude/modus/rules/…` import
  lines in `CLAUDE.md`, existing hooks/commands/permissions/MCP servers —
  including **legacy copies** from the pre-plugin era (a copied
  `context-guard.mjs`, `roadmap.md`, or pasted rule bodies): flag those for
  migration, not double-install.

## 2. Present the checklist

Print a grouped table (by `category`) of every catalog entry:

| ✓ | id | Title | Kind | Recommended? | Already present? |
|---|----|-------|------|--------------|------------------|

Derive **Recommended?** from each entry's `recommendWhen` vs. what you sniffed.
Honor `$ARGUMENTS` as a filter (category or id). Then use **AskUserQuestion**
(multiSelect) to let the user pick; pre-check recommended, not-yet-present
entries. Respect `dependsOn`: offer missing dependencies alongside.

## 3. Install each selected entry

- **plugin** → merge `{"enabledPlugins": {"<id>@modus": true}}` into
  `.claude/settings.local.json` (use `.claude/settings.json` instead only if the
  user wants the choice committed for everyone). Deep-merge; never clobber.
  If the `modus` marketplace isn't registered yet, have the user run
  `/plugin marketplace add ~/Projects/modus` first.
- **rule** → make sure the core `modus` plugin is enabled at user scope (it
  syncs the rule files); then append one import line to the project's
  `CLAUDE.md` under a `## House rules` section (create file/section if absent):
  `@~/.claude/modus/rules/<slug>.md`. **Never paste the rule body** — the
  import IS the mechanism. If the body is already pasted from the old era,
  offer to replace it with the import line.
- **settings** → deep-merge the fragment's keys into the right settings file
  (project `settings.local.json`, or `~/.claude/settings.json` for global).
- **mcp** → add the server block to `<project>/.mcp.json`. If
  `requiresSecret: true`, insert the placeholder, explicitly ask the user for
  the secret (or tell them to fill it in), and remind them to gitignore
  `.mcp.json`.
- **environment** → run the entry's steps (machine-level, one-time).
- **convention** → nothing to copy; confirm the user has read it.

**Safety:** strip `_comment`/`_entry` helper keys before merging into real
settings. Never write a real secret into a committed file. Show a diff/summary
before non-trivial writes.

## 4. Report

Summarize installed / skipped / migrated-from-legacy, plus follow-ups the user
must do by hand — fill a secret, **restart the session so newly enabled plugins
load**, run a one-time baseline.

Filter/argument: $ARGUMENTS
