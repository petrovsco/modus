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

The clone lives at `~/Projects/modus` by convention. If it is not there, ask
where it was cloned — never guess a path from the machine's layout. Read
`<modus>/catalog.json` — the source of truth for the checklist. Never guess
entries; only offer what's in the catalog.

## 1. Sniff the current project

Read-only reconnaissance before recommending anything:

- Git repo? Solo or shared (remotes, branch-protection signals)?
- Stack markers: `package.json`, `.mcp.json`, `supabase/`, framework hints,
  existing `.claude/` dir, existing `CLAUDE.md`.
- Already installed: `enabledPlugins` in `.claude/settings.json` /
  `.claude/settings.local.json`, the rule files already in
  `.claude/rules/modus/`, existing hooks/commands/permissions/MCP servers —
  including **legacy forms** of a rule (an `@~/.claude/modus/rules/…` import
  line in `CLAUDE.md`, a pasted rule body) and **legacy copies** from the
  pre-plugin era (a copied `context-guard.mjs`, `roadmap.md`): flag those for
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
- **rule** → copy `<modus>/plugins/modus/rules/<slug>.md` to
  `<project>/.claude/rules/modus/<slug>.md`, prefixed with the line
  `<!-- managed by modus — edit the rule in the modus repo, not here -->` and a
  blank line. Claude Code loads `.claude/rules/` on its own, so **the file's
  existence is the opt-in** — no import line, and removing the rule means
  deleting the file. Make sure the core `modus` plugin is enabled at user scope:
  its SessionStart hook refreshes copies that are already there (it never
  creates one). Migrate any older form of the same rule in the same edit — an
  `@~/.claude/modus/rules/<slug>.md` import line or a pasted body in
  `CLAUDE.md` — or the rule loads twice. Leave `## House rules` as one sentence
  pointing at the folder.
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
