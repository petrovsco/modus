## Pending work lives in the roadmap

One place holds what is left to do: `docs/roadmap/` (adjust the path per repo).
One file per item, named `NNN-<slug>.md`, starting `# Roadmap: <title>` with a
`**Status:**` line. Finished briefs move to `docs/roadmap/done/`.

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
