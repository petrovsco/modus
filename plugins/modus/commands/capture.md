---
description: Capture a reusable config into modus — scan recent work for candidates (no args) or refine a given idea (with args)
argument-hint: [optional: the rule/idea in plain words; empty = scan recent work]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

You are running **modus capture** — the intake funnel for reusable agent
configs. Two entry modes, one shared tail:

- **`$ARGUMENTS` empty → scan mode.** Review recent work and propose what's
  worth capturing.
- **`$ARGUMENTS` given → refine mode.** Take the seeded idea and refine it with
  the user.

The modus repo is at `~/Projects/modus` (this machine:
`~/Projects/modus`). Read `<modus>/catalog.json` first in either
mode so you never re-propose or duplicate an existing entry — if an idea
overlaps one, offer to **update that entry** instead.

## Scan mode (no arguments)

Gather signal, read-only:

- **This session** — recurring patterns, corrections ("no, do X instead"),
  stated preferences, workflows repeated by hand.
- **Recent git history** — `git log --oneline -20` + notable diffs, for
  repeated chores that could be a command/hook/skill.
- **Permission friction** — commands approved repeatedly (candidates for an
  allowlist entry; cross-check `/fewer-permission-prompts`).

Present a table of candidates:

| # | Candidate | Kind | Scope | Why reusable | Suggested home |
|---|-----------|------|-------|--------------|----------------|

Only genuinely cross-project things belong in modus; project-only ones get
applied locally or saved to auto-memory instead. Discard one-offs and anything
already captured. Use **AskUserQuestion** (multiSelect) to pick; write nothing
before the user chooses. A clean "nothing worth capturing" is a valid outcome.
Each accepted candidate then flows through Refine below.

## Refine mode (shared tail)

Pin down, asking only what you can't infer:

- **Kind** — rule (imported CLAUDE.md snippet) · command · hook · skill · mcp
  template · permission/settings · environment · convention. Pick the lightest
  form that works. (Rules the model must *always* follow → rule; know-how the
  model should load *when relevant* → skill; something the user triggers →
  command; something that must happen deterministically → hook.)
- **When it applies** — always, or certain project shapes (`recommendWhen`).
- **The why** — one line; goes into the catalog so future-you remembers.
- **How to apply** — the concrete install step(s) for `/modus:init`.

Restate the refined config in 2–4 lines and get a thumbs-up before writing.

## Save + register

Match existing conventions; every kind has a home:

- **rule** → `plugins/modus/rules/<slug>.md` — **import-ready body only**
  (starts at its `##` heading; no meta preamble — meta lives in the catalog
  entry). It reaches projects via `@~/.claude/modus/rules/<slug>.md` imports.
- **command** → `commands/<name>.md` inside the most cohesive plugin
  (`plugins/modus/` for general tooling; `plugins/session-flow/` for session
  discipline; a new plugin if a real new area emerges).
- **hook** → script under the fitting plugin + an entry in that plugin's
  `hooks/hooks.json`, referencing scripts as `${CLAUDE_PLUGIN_ROOT}/…`.
- **skill** → `plugins/<fitting>/skills/<name>/SKILL.md` — frontmatter
  `description` written as *when to use it*, not what it is.
- **mcp template / settings / environment / convention** → `configs/…`
  (placeholders for secrets, never real values).

Then register:

1. Add/update the entry in `catalog.json` (keep JSON valid, match the shape).
2. Update the catalog table in `README.md`.
3. If a plugin's contents changed, bump its `version` in
   `.claude-plugin/plugin.json`.

## Finish

- Offer to **apply it to the current project now** (the entry's install steps).
- Offer to **commit** in the modus repo (`git -C ~/Projects/modus add … &&
  git commit -m "capture: <id>"`). Push only if the user wants it.
- Remind: changed plugins reach other sessions after `/plugin update
  <plugin>@modus` (or a restart for the rules sync).

Never write a real secret into a committed file. Confirm before the first write.

Seed idea: $ARGUMENTS
