---
description: List planned roadmap tasks with stable IDs, or pick up a task by ID to start it
argument-hint: [task ID, e.g. 2]
allowed-tools: Glob, Read
---

Roadmap tasks are one markdown file per item in `docs/roadmap/` (adjust this path
if your project keeps them elsewhere). Each file starts with `# Roadmap: <title>`
and a `**Status:**` line, followed by the brief.

## Assigning IDs (must be deterministic)

1. Glob `docs/roadmap/*.md`.
2. **Sort the file paths alphabetically by filename.** This ordering is the source
   of truth for IDs — do not use glob/mtime order.
3. Number them starting at 1. Task N = the Nth file in that sorted list.

Always re-derive IDs this way so that "task N" means the same file in every
session (as long as the file set is unchanged).

## Behavior

**If `$ARGUMENTS` is empty → list mode.**

Read each roadmap file (just enough: title, `**Status:**`, and the Goal/summary
section) and print a table:

| ID | Task | Status | Summary |
|----|------|--------|---------|

- **ID** — the number from the sorted order above.
- **Task** — the title after `# Roadmap:` (and the filename in parentheses).
- **Status** — the value from the `**Status:**` line (e.g. planned, TBC).
- **Summary** — one sentence, from the Goal / opening context.

After the table, remind the user they can run `/roadmap <ID>` — or just say
"pick up roadmap task <ID>" in any session — to start one.

**If `$ARGUMENTS` names an ID → pickup mode.**

1. Resolve the ID to its file using the deterministic sort above.
2. Read that file in full — it is the kickoff brief.
3. Confirm where the repo/app lives (run git/npm from the right folder).
4. Restate the goal and scope in 2-3 lines, then propose a concrete first step
   and start work. Follow the file's "out of scope" / "explicitly not" notes.
5. If the file's status is `TBC`, it needs a decision before building — surface
   the open question(s) and ask the user to decide rather than start coding.

Argument given: $ARGUMENTS
