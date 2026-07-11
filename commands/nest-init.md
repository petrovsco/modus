---
description: Set up the current workspace from the agent-nest config catalog (interactive checklist)
argument-hint: [optional: filter, e.g. "hooks" or a specific config id]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

You are running the **agent-nest** workspace initializer. Goal: walk the user
through picking reusable agent configs from the catalog and install the chosen
ones into *this* project (and/or the global `~/.claude`).

## 0. Locate the agent-nest repo

The repo lives at `~/Projects/tekio-workspace/agent-nest` on this
machine. If that path is missing, ask the user where they cloned agent-nest before
continuing. Read `<agent-nest>/catalog.json` — it is the source of truth for the
checklist. Never guess entries; only offer what's in the catalog.

## 1. Sniff the current project

Before recommending anything, quickly detect context (read-only):
- Is the CWD a git repo? Solo or shared (any remote / branch protection signals)?
- Stack markers: `package.json` (npm), `.mcp.json` (existing MCP servers),
  `supabase/`, framework hints, an existing `.claude/` dir, an existing `CLAUDE.md`.
- What's already installed (so you don't double-install): existing hooks, commands,
  permissions, MCP servers.

## 2. Present the checklist

Print a grouped table (by `category`) of every catalog entry:

| ✓ | id | Title | Scope | Recommended? | Already present? |
|---|----|-------|-------|--------------|------------------|

- **Recommended?** — derive from each entry's `recommendWhen` vs. what you sniffed
  (e.g. recommend `mcp-supabase` only if `supabase/` or supabase deps exist;
  recommend `direct-push` only if the repo looks solo/trunk-based — and flag it as
  "confirm first").
- **Already present?** — yes if the target file/setting already exists.
- Honor `$ARGUMENTS` as a filter (a category name or a specific id) when provided.

Then use **AskUserQuestion** (multiSelect) to let the user pick which to install.
Pre-check the recommended, not-yet-present ones. Group large lists sensibly.

## 3. Install each selected entry

For each chosen id, follow its `install` steps from the catalog. Concretely:

- **rule** → append the asset's body (the part below its `---`) into this project's
  `CLAUDE.md`. If a section with the same heading already exists, skip and note it.
- **command** → copy the asset into `<project>/.claude/commands/`.
- **hook** → copy any `.mjs` into `<project>/.claude/hooks/`, then **merge** the
  relevant hook entry into `.claude/settings.local.json` (append to existing
  `hooks.PostToolUse` — never clobber it). Replace any path placeholder with the
  real absolute path.
- **settings** → merge keys into the right file (`settings.local.json` for project
  scope, `~/.claude/settings.json` for global scope). Deep-merge; don't overwrite
  unrelated keys.
- **mcp** → add the server block to `<project>/.mcp.json`. If the entry has
  `requiresSecret: true`, insert the placeholder and **explicitly ask the user for
  the secret** (or tell them to fill it), and remind them to gitignore `.mcp.json`.
- **convention** (e.g. memory-protocol) → nothing to copy; confirm the user has read
  it and note it's active.

Respect `dependsOn`: if a selected entry depends on an unselected one, offer to add
the dependency too.

**Safety:** strip `_comment` / `_entry` / `_schema` helper keys from anything you
merge into real settings. Never write a real secret into a file that will be
committed. Show a diff/summary before writing when a change is non-trivial.

## 4. Report

Summarize what was installed, what was skipped (and why), and any **follow-ups** the
user must do by hand (fill in a secret, restart the session so new hooks/commands
load, run a one-time baseline command, etc.).

Filter/argument: $ARGUMENTS
