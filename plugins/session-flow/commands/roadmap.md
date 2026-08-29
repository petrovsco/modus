---
description: List roadmap tasks by their stable ID, or pick up a task by ID to start it
argument-hint: [task ID, e.g. 7]
allowed-tools: Glob, Read
---

Roadmap tasks are one markdown file per item in `docs/roadmap/` (adjust this path
if your project keeps them elsewhere). Finished briefs move to
`docs/roadmap/done/` and **keep their ID**. Each file starts with
`# Roadmap: <title>`, then a `**Label:**` line (bug / infra / feature /
backlog) and a `**Status:**` line, followed by the brief.

## The ID is the number in the filename

Every brief is named `NNN-<slug>.md` — three digits, a hyphen, then the slug:

```
docs/roadmap/007-nutrition-food-recovery-score.md          → task 7
docs/roadmap/done/004-sport-db-constraint-name-cleanup.md  → task 4 (done)
```

**That number is the ID and it never changes.** Not when the title is rewritten,
not when the slug is renamed, not when the brief moves into `done/`. Never
renumber a brief to close a gap — gaps are correct and expected.

Do not derive IDs from sort order, position, or mtime. Read them off the
filenames.

**A `.md` file without a `NNN-` prefix is not a task.** The roadmap directory is
allowed to hold folder furniture — a `README.md` describing the convention, a
shared-context file the briefs all tell you to read first. Those are reference,
not work: skip them everywhere in this command, never list them, and never
assign them an ID. The only exception is a repo adopting the convention, where
the *briefs* are genuinely unnumbered — see *Adopting the convention* below, and
even there the furniture stays unnumbered.

## Allocating an ID for a new brief

1. Glob **both** `docs/roadmap/*.md` and `docs/roadmap/done/*.md`.
2. Take the highest numeric prefix across that combined list — the done ones
   count. That is the high-water mark.
3. The new brief gets **high-water + 1**, zero-padded to three digits.

**IDs are never reused.** A brief that is finished, cancelled, or obsolete is
*moved into `done/`* — never deleted — so the high-water mark stays visible in a
directory listing and a retired ID can never be handed to a different task.

## Behavior

**If `$ARGUMENTS` is empty → list mode.**

Read each brief in `docs/roadmap/*.md` (just enough: title, `**Label:**`,
`**Status:**`, and the Goal / opening section) and print a table sorted by ID:

| ID | Task | Label | Status | Summary |
|----|------|-------|--------|---------|

- **ID** — the filename prefix with leading zeros dropped (`007-` → `7`).
- **Task** — the title after `# Roadmap:`.
- **Label** — the value from the `**Label:**` line (bug / infra / feature /
  backlog); `—` for a brief that predates the convention.
- **Status** — the value from the `**Status:**` line (e.g. planned, TBC).
- **Summary** — one sentence, from the Goal / opening context.

Then one closing line. The done briefs do not need reading — their filenames
carry everything it needs:

> Done: N briefs (IDs …) in `docs/roadmap/done/`. Next free ID: **NNN**.

Finally, remind the user they can run `/roadmap <ID>` — or just say "pick up
roadmap task <ID>" in any session — to start one.

**If `$ARGUMENTS` names an ID → pickup mode.**

Accept `7`, `07` and `007` as the same task.

1. Resolve the ID against `docs/roadmap/*.md` **and** `docs/roadmap/done/*.md`.
   - No match → say so and list the valid IDs. Never quietly pick a neighbouring
     task; a wrong guess here starts the wrong work.
   - Match inside `done/` → say the task is already done, show its status line,
     and ask whether to reopen it before doing anything else.
2. Read that file in full — it is the kickoff brief.
3. Confirm where the repo/app lives (run git/npm from the right folder).
4. Restate the goal and scope in 2-3 lines, then propose a concrete first step
   and start work. Follow the file's "out of scope" / "explicitly not" notes.
5. If the file's status is `TBC`, it needs a decision before building — surface
   the open question(s) and ask the user to decide rather than start coding.

## Adopting the convention

First separate the briefs from the furniture: a `README.md`, an index, or a
shared-context file stays where it is and stays unnumbered. Then seed IDs for the
briefs **once**, in the order they were created, so that a low ID means an old
task:

```bash
for f in $(ls docs/roadmap/*.md docs/roadmap/done/*.md); do
  echo "$(git log --diff-filter=A --follow --format=%at -- "$f" | tail -1)|$f"
done | sort -t'|' -k1,1n
```

**If the briefs already carry a sequence of their own** — `u3`, `u4`, `u5` in the
filenames, phase numbers, anything the user says out loud — adopt *those* numbers
as the IDs instead of renumbering from 1. The point of the ID is that it matches
what is already in the user's head; a scheme that renames "U9" to "task 7" costs
more than it fixes. Units already finished and gone simply leave their numbers
unused, which is what gaps are for.

Where there is no git history to sort by (an untracked docs folder), fall back to
mtime, and say so — mtime is a weaker signal and the user may want to correct it.

Number that list and `git mv` each file to `NNN-<slug>.md`. Then repoint
every reference that named the old filename — links in other briefs, in the
project's reference docs, and in source-code comments — and verify no markdown
link is left dangling. Rewrite those references with a script that reads and
writes whole files; `sed -i` under Git Bash strips `\r` and turns a small edit
into a whole-file diff on a CRLF repo.

After the seed, IDs are only ever allocated one at a time by the rule above.

Argument given: $ARGUMENTS
