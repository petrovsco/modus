# Roadmap: Roadmap board — drag a card to change its target release

**Label:** feature
**Status:** blocked — task 7 rewrites the same write path for frontmatter files; building this on the old line-writer would mean writing it twice
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-09, from "we need to create another task, for changing a destination version of a task".
**Depends:** 007

## Goal

Retarget a ticket by dragging it. Group the board by release, drop a card in
another release's column, and the board rewrites that brief's `**Release:**`
line. Drop it in **no release** and the line goes away.

Scheduling is already defined as exactly this edit — `/roadmap` says "adding,
changing, or removing the line *is* the scheduling act; there is no other
bookkeeping". Today that act is a hand edit in a file, while the board next to
it already draws the release columns and refuses to let you drop anything into
them. This brief closes that gap.

## Approach

- **A second write route, sharing one set of file mechanics.** `write_status()`
  in `server.py` already does the delicate part: find `NNN-*.md` by ID, read
  bytes (never `read_text`, so CRLF survives), locate the header line, replace
  a wrapped value whole, write back. Factor that into one helper and let both
  writes use it. Keep the routes separate — `POST /api/release` alongside
  `POST /api/status` — because their payloads differ: a status carries a typed
  sentence, a release carries only the column's name.
- **The new mechanic is insert and delete, not just rewrite.** Most briefs have
  no `**Release:**` line at all, so the write has to *add* one, in the header
  block and in the order the convention documents — Label, Status, Depends,
  Release — not at the end of the file. Dropping on **no release** deletes the
  line and leaves no blank gap behind.
- **What accepts a drop:** every column the release grouping draws — releases
  declared in `releases.md`, releases that only briefs name (the board already
  picks one canonical spelling in `merge_releases`; the write uses *that*, so
  dragging a card also normalizes it), and **no release**.
- **A shipped release is not a drop target.** A release whose `releases.md`
  status reads `released <date>` is history; adding a ticket to it after the
  fact rewrites what shipped. Refuse the drop with a message, the way Done is
  refused. Dragging a still-open ticket *out* of a shipped release is allowed —
  that is exactly the decision `/roadmap` asks for when a release ships.
- **No box to type in.** A status needed one because the column supplies only
  the keyword and a person owes the sentence. A release line is the whole
  value, so the drop writes immediately and the board reports what changed;
  dragging the card back undoes it. Removal is reported the same way, spelled
  out ("task 7 is no longer scheduled"), so it can't look like a slip.
- **Cards in `done/` do not lift**, same as task 3. A retired brief's release
  line is the record of what shipped in what, and it stays.
- **The same guard.** Loopback `Host`, same-origin `Origin`, the custom header
  that forces a preflight, and `--read-only` switching the whole write path
  off — reused, not re-implemented.
- No git-disagreement warning is needed here. The board infers a *state* from
  recent commits; it never infers a release, so nothing overrides this write on
  the next scan.

## Explicitly not

- **Declaring, renaming or retiring a release.** `releases.md` is furniture and
  stays a file edit — including flipping a release to `released <date>`.
- Editing a card's label, dependencies or title from the browser.
- Retiring a brief into `done/`, which is still a file move plus un-blocking
  its dependants.

## Acceptance

- [ ] With `Group: release`, dragging a card between release columns rewrites
      the brief's `**Release:**` line
- [ ] A brief with no release line gets one inserted in the header block, after
      `**Status:**` / `**Depends:**` — not appended to the end of the file
- [ ] Dropping on **no release** removes the line, leaving no blank gap
- [ ] A column for a release only briefs name writes the canonical spelling the
      board displays
- [ ] Drops onto a release marked `released <date>` are refused with a message;
      dragging an open ticket out of one is allowed
- [ ] Cards in `done/` are not draggable, and dragging stays off when columns
      are grouped by label or project
- [ ] Only the `**Release:**` line changes — the rest of the file is
      byte-identical, and a CRLF brief stays CRLF
- [ ] Task 3's status drag still works, and both writes go through one shared
      file-mechanics helper rather than two copies of it
- [ ] Cross-origin and non-loopback requests are rejected; `--read-only`
      disables this route too
- [ ] `tools/roadmap-board/README.md` describes both writes, and the root
      README's one-line summary of the tool is updated
- [ ] Verified in a browser: retarget, remove, and a refused drop
