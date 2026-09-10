---
description: List RFCs by their stable ID, pick one up by ID, or show a release's scope
argument-hint: [RFC ID, e.g. 7 — or a release, e.g. 2.0.0]
allowed-tools: Glob, Read, Edit, Bash
---

A project's plan lives in its **specification repository**, named
`<project>.rfcs` — one numbered RFC per unit of work, in `rfcs/`. The code
repository holds code and nothing about what is intended next. The full
convention is the `rfc-convention` house rule; what follows is what this command
needs.

## Finding the RFCs

From the current project, in order — stop at the first that exists:

1. `../<project>.rfcs/rfcs/` — the specs repo cloned beside the code repo.
2. `../<project>.rfcs/rfcs/` from the workspace root, for workspace-shaped
   projects (`lumi-workspace/lumi/` → `lumi-workspace/lumi.rfcs/rfcs/`).
3. `docs/roadmap/` inside the code repo — a project that has not been migrated
   yet. Everything below still applies; the files just use the older header
   (`**Label:**` / `**Status:**` lines instead of frontmatter) and three-digit
   IDs. Say once, in the closing line, that this project is still unmigrated.

If none exists, say so and offer to create the specs repo from
`configs/rfcs/` in the modus catalog. Do not invent a location.

## The file

`rfcs/NNNN-<slug>.md` — four digits, a hyphen, a slug. YAML frontmatter, then
`# RFC NNNN: <title>`, then the sections.

```yaml
---
title: Retire the flat exercises fallback
authors: [Peter Petrov]
created: 2026-08-14
last_updated: 2026-09-10
status: planned
status_note: committed for 2.1.0; nothing blocks it
label: infra
depends: [46]
release: 2.1.0
---
```

`status` is one of six keywords — `backlog` (not committed to yet) · `planned`
(committed and kickoff-ready) · `in progress` · `blocked` (something outside the
RFC must land first) · `done` (shipped) · `discarded` (dropped without
shipping). `status_note` carries the sentence a person reads. `label` is one of
bug / infra / feature / backlog. `depends` lists RFC numbers that must land
first — hard blockers only, omitted when there are none. **Any edit to the file
bumps `last_updated` in the same edit.**

Retired RFCs — shipped or dropped — move to `rfcs/done/` and **keep their
number**. That folder holds both endings, so an RFC in there is only "done" if
it says so; one reading `discarded` is reported as dropped, never as shipped.

## The ID is the number in the filename

```
rfcs/0071-retire-flat-exercises-fallback.md   → RFC 71
rfcs/done/0004-sport-db-constraint-cleanup.md → RFC 4 (retired)
```

**That number never changes** — not when the title is rewritten, not when the
slug is renamed, not when the file moves into `done/`. Never renumber to close a
gap; gaps are correct and expected. Do not derive IDs from sort order, position
or mtime — read them off the filenames.

**Allocating one:** glob both `rfcs/*.md` and `rfcs/done/*.md`, take the highest
numeric prefix across the combined list, add one, pad to four digits. IDs are
never reused: a finished, cancelled or obsolete RFC is *moved into `done/`*,
never deleted, so the high-water mark stays visible in a directory listing.
`0000-template.md` is the template and is never an RFC.

**A `.md` file without a `NNNN-` prefix is not an RFC.** `README.md`,
`releases.md`, and any shared-context file the RFCs point at are furniture:
never listed, never given an ID.

## Releases

`release:` commits an RFC to one release and stays when the file retires — that
is what keeps a shipped release's scope browsable. Adding, changing or removing
it *is* the scheduling act; there is no other bookkeeping.

Releases are declared in `rfcs/releases.md` (furniture): one `##` section per
release whose heading text is the name exactly as RFCs spell it, with
`**Target:**` (free-form date) and `**Status:** planned | released <date>`.
File order is display order. A release named only by RFCs still works — tooling
shows it as undeclared — but declare it as soon as it is real.

When the user says **"plan release X"**: make sure `releases.md` declares X,
then scope it by editing `release:` fields — tag what must ship in X, untag what
moves out and say where it went. Work that can only happen *after* X ships is
not part of X; give it `depends` or a blocked status naming the release. When X
ships, flip its `releases.md` status to `released <date>`; anything still open
gets a decision — move it to the next release, or drop the tag.

## Statuses are part of the job, not a report about it

Organizing work includes correcting what the list gets wrong. While reading,
watch for the two disagreements that make a board lie, name them in the closing
lines, and fix them in place the moment the user says yes:

- **Blocked but not saying so** — `depends` names an RFC that is not in `done/`
  while the status reads `planned`, `backlog` or `in progress`. It should read
  `blocked`, with `status_note` naming what it waits on.
- **Waiting for something that already landed** — status reads `blocked` but
  every named blocker is in `done/`. It should read `planned` again.

This holds in every session, not only under this command: the moment you tell
the user that one task waits on another, write it into the RFC before moving on.
A dependency worked out during planning and reported only in prose leaves every
file unchanged — the plan *is* the edits.

## Behavior

**If `$ARGUMENTS` is empty → list mode.**

Read each RFC in `rfcs/*.md` (frontmatter plus the Summary section is enough)
and print a table sorted by ID:

| ID | RFC | Label | Status | Summary |
|----|-----|-------|--------|---------|

- **ID** — the filename prefix with leading zeros dropped (`0071-` → `71`).
- **RFC** — the `title`.
- **Label** — `label`; `—` for a file that predates the convention.
- **Status** — the `status` keyword plus its `depends` IDs when it has any.
  Mark a status that disagrees with `depends`, per the section above.
- **Release** — the `release` value. Include this column only when at least one
  RFC carries it.
- **Summary** — one sentence, from `status_note` or the Summary section.

Then one closing line. Retired files do not need reading — their filenames carry
everything — but call them *retired*, not *done*: that folder holds what was
dropped as well as what shipped, and which is which only shows inside.

> Retired: N RFCs (IDs …) in `rfcs/done/`. Next free ID: **NNNN**.

Finally, remind the user they can run `/roadmap <ID>` — or just say "pick up
RFC <ID>" in any session — to start one.

**If `$ARGUMENTS` is not a number and names a release → release mode.**

Match it case-insensitively against `releases.md` headings and `release:` values
across active **and** retired RFCs. Print the release's header (target, status,
description), then its RFCs in the list-mode table, plus a progress line: *N of
M done* — and *K discarded* when any were, because a dropped RFC is neither
shipped nor still owed. If the argument matches nothing, say so and list the
known releases. A bare number is always an ID, never a release.

**If `$ARGUMENTS` names an ID → pickup mode.**

Accept `7`, `07`, `007` and `0007` as the same RFC.

1. Resolve it against `rfcs/*.md` **and** `rfcs/done/*.md`.
   - No match → say so and list the valid IDs. Never quietly pick a neighbouring
     RFC; a wrong guess here starts the wrong work.
   - Match inside `done/` → say which ending it had, quoting `status` and
     `status_note`: already shipped, or dropped (give the reason — it is usually
     the answer to "why aren't we doing this"). Ask whether to reopen it before
     doing anything else.
2. Read that file in full — it is the kickoff brief.
3. Confirm where the **code** repo lives, and that the **specs** repo is on its
   main branch with a clean tree. Both get commits before the session ends;
   neither is left dirty.
4. **Check it is startable before starting.** Entries under
   `## Unresolved questions` mean it needs a decision first — surface them and
   ask the user to decide rather than start coding. If `depends` names an RFC
   that is not in `done/`, do not start: say what it waits on, set the status to
   `blocked` if it does not already say so, and offer that blocker as the RFC to
   pick up instead. A `backlog` RFC is not blocked — picking it up *is* the
   decision to commit, so say so and relabel it on the way past.
5. **Set `status: in progress`** — with a `status_note` on what is being done,
   and `last_updated` bumped — before the work starts, not after. Nothing else
   records that this RFC is now taken. Commit that edit in the specs repo
   immediately; it is not a change to hold until the end.
6. Restate the goal and scope in 2-3 lines, then propose a concrete first step
   and start work. Follow the file's `## Non-Goals`.

## Migrating a project to the convention

A project still keeping `docs/roadmap/` inside its code repo moves in one pass,
and history comes with it — `git filter-repo --path docs/roadmap/`, never a copy
of the files into a fresh repo, because a status line's history is how its story
is read back. Then:

- Rename `NNN-<slug>.md` → `NNNN-<slug>.md`. The number is the ID and does not
  change; only its padding does.
- Convert each header: `**Label:**` → `label`, the `**Status:**` keyword →
  `status` with its sentence as `status_note`, `**Depends:**` → `depends`,
  `**Release:**` → `release`. `created` comes from the file's first commit
  (`git log --diff-filter=A --format=%ad --date=short -- <file> | tail -1`),
  `last_updated` from its last.
- Add the missing sections rather than leaving a half-shaped file — at minimum
  Summary, Non-Goals and Acceptance.
- Delete `docs/roadmap/` from the code repo in a commit of its own, and repoint
  every reference to it — links in other documents, and source-code comments.
- Rewrite the files with a script that reads and writes whole files; `sed -i`
  under Git Bash strips `\r` and turns a small edit into a whole-file diff on a
  CRLF repo.

**Where the briefs already carry a sequence of their own** — `u3`, `u4`, `u5`,
phase numbers, anything the user says out loud — adopt *those* numbers as the
IDs rather than renumbering from 1. The point of an ID is that it matches what
is already in the user's head.

Argument given: $ARGUMENTS
