## Pending work lives in the roadmap

One place holds what is left to do: `docs/roadmap/` (adjust the path per repo).
One file per item, named `NNN-<slug>.md`, starting `# Roadmap: <title>` with a
`**Label:**` line and a `**Status:**` line. Finished briefs move to `docs/roadmap/done/`.

A `.md` file in that directory *without* a number — a README explaining the
convention, a shared-context doc the briefs tell you to read first — is
furniture, not a task. It keeps its plain name and `/roadmap` ignores it.

**The number in the filename is the task ID.** It is allocated once, when the
brief is created, and never changes — not when the title is rewritten, not when
the slug is renamed, not when the brief moves into `done/`. Refer to work by that
number ("task 7"), because it is the only handle that survives the file changing
underneath it. An ID derived from position in a sorted list is not an ID: it
silently repoints at a different task the next time a brief is added or renamed,
and every note, commit message and conversation that used it is now wrong.

To allocate one: take the highest number across `docs/roadmap/` **and**
`docs/roadmap/done/`, add one, pad to three digits. Never reuse a number and
never renumber to close a gap — gaps are the record of retired work. A brief that
is finished or abandoned is *moved into `done/`*, never deleted, so the count
keeps climbing past everything that has ever been on the roadmap.

**Every active brief carries a label.** A `**Label:**` line sits directly above
`**Status:**`, holding exactly one of four values:

- **bug** — something already shipped behaves wrongly; the brief restores the
  intended behavior.
- **infra** — structure, tooling, process, or platform work (auth, migrations,
  build tooling, the process docs themselves). Not itself a user-visible change.
- **feature** — committed product work: something the user will see or use.
- **backlog** — an idea not yet committed to. Parked until the context or the
  decision that makes it kickoff-ready arrives; then relabel it in place
  (usually to feature).

The label names the kind of work; the `**Status:**` line tracks where it
stands. Give every new brief its label at creation. A brief that predates the
convention just lacks the line — add one when you next touch it.

**The `**Status:**` line starts with one of five words.** Everything after the
em dash is for a person; the first word is what tooling reads.

| Keyword | Means |
|---|---|
| `backlog` | not committed to yet; it needs a decision or more context |
| `planned` | committed and kickoff-ready; nobody is working on it |
| `in progress` | someone is working on it now |
| `blocked` | committed, but something outside the brief must happen first |
| `done` | finished — the file lives in `done/` |

Then an em dash and **one or two sentences** on where it actually stands. Not
three paragraphs: a status line that has grown into a changelog is unreadable to
both people and tools, and it is the first sign a brief has stopped being
maintained. Long-running briefs keep their history in a `## Progress log`
section of dated bullets right after the header instead.

**Close on evidence, not on feeling.** Write each item in a brief's
`## Acceptance` section as a `- [ ]` checkbox and tick it when it is true. All
boxes ticked means the brief is `done` and moves to `done/`; an open box means it
is not done, however long ago it started. Without this, briefs drift — a brief
saying "in progress" for six weeks whose work shipped in week one is worse than
no brief, because it makes the whole list untrustworthy.

**A new brief declares where it sits in the running order.** Ordering is not a
separate planning artefact; it falls out of one optional header line:

```markdown
**Depends:** 018, 019
```

Hard blockers only, by task ID. A dependency parks the brief behind another one,
so list only what genuinely parks it — a soft overlap ("check this doesn't fork
the same model") is prose, not a dependency. Omit the line when nothing blocks
it. Dependencies on a task already in `done/` are ignored, so a brief never has
to be edited when its blocker lands.

Answer three questions when you create a brief, and write the answers into the
header:

1. **What has to land first?** → the `**Depends:**` line.
2. **Are we committed to this?** → `planned` if yes, `backlog` if it still needs
   a decision. "Committed" is a real bar: if nobody would start it this month,
   it is backlog, and putting it in planned only makes the planned column
   meaningless.
3. **What does it unblock?** → if the answer is an existing brief, add
   `**Depends:** <this id>` to *that* brief. A dependency is one edge and it has
   two ends; recording it on only one leaves the order wrong.

**A brief committed to a release says so.** One optional header line —
`**Release:** 2.0.0` — one release per brief, kept when the brief moves to
`done/` so a shipped release's scope stays browsable. Releases are declared in
`docs/roadmap/releases.md` (furniture, never a task): one `##` section per
release whose heading text is the name exactly as briefs spell it, with
optional `**Target:**` and `**Status:** planned | released <date>` lines.
Editing the `**Release:**` line *is* the scheduling act — tag what must ship in
the release, untag what moves out. Work that can only happen *after* the
release ships is not in it; it depends on it.

**Reference docs must not carry future work.** A doctrine, an index, an ADR, a
README states what *is* and why. The moment one grows a "proposed edit",
"follow-up", "next step", "TODO", or "needs a brief", that item has escaped
tracking — it is remembered, not scheduled, and nothing lists it. It is also
where work goes to die: nobody re-reads a reference doc looking for a task.

When you notice one:

1. **Move the item into a roadmap file** — allocate the next ID, and carry the
   whole argument, not a summary, so the brief is kickoff-ready on its own and
   the reader never needs both files.
2. **Leave a one-line pointer** where it was, naming the brief.
3. **Repoint anything that referenced the old location.**

**Decisions stay; the work they create moves.** "Habits is shelved, delete by
2026-10-07" is a decision and belongs in the doctrine that made it. *Deleting the
component* is a roadmap item. Likewise a README documenting how a one-time setup
step works is reference; the fact that nobody has run it yet is a roadmap item.

**Applies to writing, not just tidying.** When finishing a piece of work leaves a
remainder, the remainder becomes a roadmap file in the same change — never a
parting paragraph in the doc you happened to have open.

**The test:** if it is not a file in the roadmap directory, `/roadmap` cannot see
it — so it is not on the roadmap, whatever the document holding it calls itself.
