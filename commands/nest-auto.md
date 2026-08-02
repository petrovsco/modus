---
description: Review recent work and suggest new reusable agent configs to capture into agent-nest
argument-hint: [optional: focus, e.g. "hooks" or "this session"]
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
---

You are running **agent-nest auto-suggest**. Goal: look at what was actually done
recently and propose reusable agent configs worth capturing — either as a new
catalog entry in agent-nest, or applied to the current project.

## 1. Gather signal

Review, read-only:
- **This session** — recurring patterns, corrections the user made ("no, do X
  instead"), preferences they stated, workflows repeated by hand.
- **Recent git history** — `git log --oneline -20` and notable diffs, for repeated
  chores that could be a command/hook.
- **Permission friction** — commands the user approved repeatedly (candidates for a
  permission allowlist entry — cross-check `/fewer-permission-prompts`).
- **The existing catalog** — read `<agent-nest>/catalog.json` (repo at
  `~/Projects\feya-workspace\agent-nest`; if that path is missing, ask
  the user where they cloned agent-nest) so you don't re-propose something already
  captured.

## 2. Form candidates

For each thing worth capturing, classify it:

- **artifact type** — rule (CLAUDE.md snippet) · command · hook · skill · mcp ·
  permission · convention.
- **scope** — one project, or genuinely cross-project (only cross-project things
  belong in agent-nest; project-only ones just get applied locally / saved to
  memory).
- **why it's reusable** — one line. If you can't articulate the reuse, drop it.

Discard: one-off actions, anything already in the catalog, anything better left as
an auto-memory fact (a pure preference with no config artifact).

## 3. Propose

Present a short table of candidates:

| # | Candidate | Type | Scope | Why reusable | Suggested home |
|---|-----------|------|-------|--------------|----------------|

Then use **AskUserQuestion** to let the user pick which to act on (multiSelect).
Don't write anything until they choose.

## 4. Act

For each accepted candidate, hand off to the `/nest-rule` flow (refine → format →
save into agent-nest → register in `catalog.json`), or, if it's project-local, apply
it here / save it to auto-memory. Confirm before committing anything in agent-nest.

If nothing meets the bar, say so plainly — a clean "nothing worth capturing this
time" is a valid outcome.

Focus/argument: $ARGUMENTS
