---
description: List roadmap tasks by their stable ID, pick up a task by ID, or show a release's tickets
argument-hint: [task ID, e.g. 7 — or a release, e.g. 2.0.0]
allowed-tools: Glob, Read, Edit
---

Roadmap tasks are one markdown file per item in `docs/roadmap/` (adjust this path
if your project keeps them elsewhere). Retired briefs — shipped or dropped —
move to `docs/roadmap/done/` and **keep their ID**. Each file starts with
`# Roadmap: <title>`, then a `**Label:**` line (bug / infra / feature /
backlog), a `**Status:**` line, and optional `**Depends:**` and `**Release:**`
lines — then the brief.

The `**Status:**` line **starts with one of six keywords**, then an em dash and
a sentence: `backlog` (not committed to yet) · `planned` (committed and
kickoff-ready) · `in progress` · `blocked` (something outside the brief must
happen first) · `done` (shipped) · `discarded` (dropped without shipping).
`done/` holds both endings, so a brief in there is only "done" if it says so —
one that says `discarded` is reported as discarded, never as shipped.

`**Depends:**` lists the task IDs that must land first — hard blockers only,
omitted when there are none. A brief whose dependency is still open reads
`blocked`: the two lines are halves of one statement.

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

## Releases

A brief can be committed to a release with one optional header line:

```markdown
**Release:** 2.0.0
```

One release per brief, and the line **stays when the brief moves to `done/`** —
that is what keeps a shipped release's scope browsable afterwards. Adding,
changing, or removing the line *is* the scheduling act; there is no other
bookkeeping.

Releases themselves are declared in `docs/roadmap/releases.md` — furniture (no
`NNN-` prefix, never a task). One `##` section per release; **the heading text
is the release name**, spelled exactly as briefs reference it:

```markdown
## 2.0.0

**Target:** 2026-10-15
**Status:** planned

One paragraph on the theme of the release.
```

`**Target:**` is a free-form date; `**Status:**` is `planned` (the default) or
`released <date>`. File order is the display order. A release named only by
briefs still works — tooling shows it as undeclared — but declare it as soon as
it is real.

When the user says **"plan release X"** (or add/move/revise tickets for it):
make sure `releases.md` declares X; then scope it by editing `**Release:**`
lines — tag the briefs that must ship in X, untag what moves out (say where it
went: a later release, or unscheduled). Work that can only happen *after* X
ships is not part of X — it depends on it; give it a `**Depends:**` or a
blocked status naming the release instead. Creating a brief for a release means
creating it normally (next free ID) plus the one `**Release:**` line. When X
ships, flip its `releases.md` status to `released <date>` — briefs that are done
move to `done/` as usual; anything still open gets a decision: move it to the
next release or drop the tag.

## Statuses are part of the job, not a report about it

Organizing tasks includes correcting what the list gets wrong. While reading the
briefs, watch for the two disagreements that make a board lie, and name them in
the closing lines — offering to fix them, and fixing them in place the moment
the user says yes:

- **Blocked but not saying so** — a brief whose `**Depends:**` names a task that
  is not in `done/` while its own status reads `planned`, `backlog` or
  `in progress`. It should read `blocked — waiting on <id>`.
- **Waiting for something that already landed** — a brief reading `blocked`
  whose named blockers are all in `done/`. It should read `planned` again.

This holds in every session, not only under this command: the moment you tell
the user that one task waits on another, write it into the brief before moving
on. A dependency worked out during planning and reported only in prose leaves
every brief unchanged — the plan *is* the edits.

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
- **Status** — the keyword from the `**Status:**` line (backlog / planned /
  in progress / blocked), plus its `**Depends:**` IDs if it has any. Mark a
  status that disagrees with the depends line, per the section above.
- **Release** — the `**Release:**` value. Include this column only when at
  least one brief carries the line.
- **Summary** — one sentence, from the Goal / opening context.

Then one closing line. The retired briefs do not need reading — their filenames
carry everything it needs — but call them *retired*, not *done*: that folder
holds what was discarded as well as what shipped, and which is which only shows
in their status lines. Read those only if the user asks.

> Retired: N briefs (IDs …) in `docs/roadmap/done/`. Next free ID: **NNN**.

Finally, remind the user they can run `/roadmap <ID>` — or just say "pick up
roadmap task <ID>" in any session — to start one.

**If `$ARGUMENTS` is not a number and names a release → release mode.**

Match it (case-insensitively) against `releases.md` headings and the
`**Release:**` values across active **and** done briefs. Print the release's
`releases.md` header (target, status, description), then its tickets in the
list-mode table plus a progress line: *N of M done* — and *K discarded* when any
were, because a dropped ticket is neither shipped nor still owed. If the
argument matches nothing, say so and list the known releases. A bare number is
always a task ID, never a release.

**If `$ARGUMENTS` names an ID → pickup mode.**

Accept `7`, `07` and `007` as the same task.

1. Resolve the ID against `docs/roadmap/*.md` **and** `docs/roadmap/done/*.md`.
   - No match → say so and list the valid IDs. Never quietly pick a neighbouring
     task; a wrong guess here starts the wrong work.
   - Match inside `done/` → say which ending it had, quoting the status line:
     already shipped (`done`), or dropped (`discarded` — give the reason, it is
     usually the answer to "why aren't we doing this"). Ask whether to reopen it
     before doing anything else.
2. Read that file in full — it is the kickoff brief.
3. Confirm where the repo/app lives (run git/npm from the right folder).
4. **Check it is startable before starting.** If the status is `TBC` or the
   brief carries open questions, it needs a decision first — surface them and
   ask the user to decide rather than start coding. If its `**Depends:**` names
   a task that is not in `done/`, do not start: say what it waits on, set the
   status to `blocked — waiting on <id>` if it does not already say so, and
   offer that blocker as the task to pick up instead. A `backlog` brief is not
   blocked — picking it up *is* the decision to commit, so say so and relabel it
   on the way past.
5. **Set the status to `in progress`** — one edit to the `**Status:**` line,
   with a sentence on what is being done — before the work starts, not after.
   Nothing else records that this task is now taken.
6. Restate the goal and scope in 2-3 lines, then propose a concrete first step
   and start work. Follow the file's "out of scope" / "explicitly not" notes.

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
