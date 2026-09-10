---
name: capture
description: Watcher for reusable agent configs. Use PROACTIVELY in repos
  initialized with modus when a capture-worthy signal appears — the user
  corrects a workflow ("no, do X instead"), states a durable preference,
  repeats a manual chore, or keeps approving the same permission. Also use
  whenever the user asks to capture a rule, workflow, or config idea into
  modus.
---

# modus capture — the intake funnel

Turn observed signals or a stated idea into a properly-registered reusable
config in the modus repo (`~/Projects/modus` by convention — ask where it was
cloned if it is not there).

## Gate: is the watcher armed here?

This skill acts proactively **only in repos initialized with modus** — i.e.
the project has `@~/.claude/modus/rules/…` import lines in its CLAUDE.md or an
`…@modus` plugin enabled in its `.claude/settings.json*`. In any other repo,
stay quiet unless the user explicitly asks to capture something. When you do
propose, propose — never write before the user picks.

Read `<modus>/catalog.json` first so you never re-propose or duplicate an
existing entry — if an idea overlaps one, offer to **update that entry**.

## Two entry modes

- **Observed signal / no explicit idea → scan.** Ground the proposal in
  evidence: this session's corrections and repeated hand-work, `git log
  --oneline -20` for recurring chores, permission friction (cross-check
  `/fewer-permission-prompts`). Present candidates:

  | # | Candidate | Kind | Scope | Why reusable | Suggested home |
  |---|-----------|------|-------|--------------|----------------|

  Only genuinely cross-project things belong in modus; project-only ones get
  applied locally or saved to auto-memory. Discard one-offs and anything
  already captured. Use **AskUserQuestion** (multiSelect) to pick. A clean
  "nothing worth capturing" is a valid outcome.

- **The user hands you an idea → refine it directly.**

## Refine (shared tail)

Pin down, asking only what you can't infer:

- **Kind** — rule (imported CLAUDE.md snippet) · command · hook · skill · mcp
  template · permission/settings · environment · convention. Pick the lightest
  form that works. (Always-follow → rule; load-when-relevant know-how → skill;
  user-triggered → command; must-happen-deterministically → hook.)
- **When it applies** — always, or certain project shapes (`recommendWhen`).
- **The why** — one line; goes into the catalog so future-you remembers.
- **How to apply** — the concrete install step(s) for `/modus:init`.

Restate the refined config in 2–4 lines and get a thumbs-up before writing.

## Save + register

Match existing conventions; every kind has a home:

- **rule** → `plugins/modus/rules/<slug>.md` — **import-ready body only**
  (starts at its `##` heading; meta lives in the catalog entry). Reaches
  projects via `@~/.claude/modus/rules/<slug>.md` imports.
- **command** → `commands/<name>.md` inside the most cohesive plugin.
- **hook** → script under the fitting plugin + an entry in that plugin's
  `hooks/hooks.json`, referencing scripts as `${CLAUDE_PLUGIN_ROOT}/…`.
- **skill** → `plugins/<fitting>/skills/<name>/SKILL.md` — frontmatter
  `description` written as *when to use it*, not what it is.
- **mcp template / settings / environment / convention** → `configs/…`
  (placeholders for secrets, never real values; pin versions, never `@latest`).

Then register:

1. Add/update the entry in `catalog.json` (keep JSON valid, match the shape).
2. Update the catalog table in `README.md`.
3. **Bump the owning plugin's patch version** (`1.3.0 → 1.3.1`) in its
   `.claude-plugin/plugin.json` — installs are version-cached; without the bump
   nothing propagates. Patch only: minor/major versions are planned releases
   (declared in the modus repo's `docs/roadmap/releases.md`) and move on the
   user's say-so, never automatically.

## Finish

- Offer to **apply it to the current project now** (the entry's install steps).
- Offer to **commit** in the modus repo (`git -C ~/Projects/modus add … &&
  git commit -m "capture: <id>"`). Push only if the user wants it.
- Remind: other machines/sessions pick the change up via
  `claude plugin update <plugin>@modus` (plus a session restart for rules).

Never write a real secret into a committed file. Confirm before the first write.
