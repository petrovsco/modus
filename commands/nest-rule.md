---
description: Refine a rule/idea through discussion and save it as a reusable config in agent-nest
argument-hint: <the rule or idea, in plain words>
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

You are running **agent-nest rule capture**. Goal: take the user's raw idea, refine
it with them, then persist it as a properly-formatted, reusable asset in the
agent-nest repo and register it in the catalog.

The agent-nest repo is at `~/Projects\feya-workspace\agent-nest`.
If that path is missing, ask the user where they cloned agent-nest before
continuing.
Seed idea: **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask the user what rule they want to capture.

## 1. Refine (discuss — don't save yet)

Read `<agent-nest>/catalog.json` first. If the idea overlaps an existing entry,
say so and offer to **update that entry** instead of creating a duplicate.

Then pin down, asking the user only what you can't infer:
- **Artifact type** — rule (CLAUDE.md snippet) · command · hook · skill · mcp
  template · permission · convention. Pick the lightest form that works.
- **Trigger / when it applies** — always, or only certain project shapes?
- **Scope** — `project` (installs into a repo's `.claude`) or `global` (`~/.claude`).
- **The "why"** — the reason behind it (goes into the asset so future-you remembers).
- **How to apply** — the concrete install step(s).

Restate the refined rule in 2-4 lines and get a thumbs-up before writing.

## 2. Draft in the right format

Match the conventions of the existing assets:
- **rule** → markdown in `configs/rules/<slug>.md` with a `# Rule: <title>` heading,
  a **Type/Scope/Why** preamble, a `---`, then the CLAUDE.md-ready body.
- **command** → a slash-command file in `configs/commands/<slug>.md` with YAML
  frontmatter (`description`, `argument-hint`, `allowed-tools`).
- **hook** → the script in `configs/hooks/` + a `settings.hooks.json`-style fragment
  showing how it wires into `settings`.
- **mcp** → `configs/mcp/<slug>.md` with a server block; use a **placeholder** for
  any secret and flag it.
- **convention** → `configs/<area>/README.md`.

## 3. Save + register

1. Write the asset file(s) under `configs/…`.
2. Add a new entry to `catalog.json` (`id`, `title`, `category`, `scope`, `summary`,
   `assets`, `install`, `recommendWhen`, `dependsOn`, `requiresSecret`). Keep JSON
   valid; match the existing entry shape.
3. Add a row to the catalog table in `SETUP-GUIDE.md` so the human doc stays in sync.

## 4. Offer to apply + commit

- Ask whether to also **apply it to the current project now** (run the entry's
  install steps here).
- Offer to **commit** the change in the agent-nest repo (`git -C <agent-nest> add …
  && git commit`). Use a concise message like `add <id> config`. Push only if the
  user wants it.

Never write a real secret into a committed file. Confirm before the first write.
