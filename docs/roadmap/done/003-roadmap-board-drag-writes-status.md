# Roadmap: Roadmap board — drag a card to write its Status line

**Label:** feature
**Status:** done — shipped 2026-09-09; drag between the four open columns rewrites the **Status:** line, Done drops are refused, verified in Chromium
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-09, from "can I move a card between columns, and what does it cost in tokens?" — nothing, the board is a local Python server and no model is in the loop.

## Goal

Move a ticket between columns by dragging its card, and have the board write
that back into the brief's `**Status:**` line. The board stops being read-only
for this one field.

Until now the README listed exactly this as out of scope — *"Editing or moving
cards from the browser — the files stay the source of truth; a write path is
its own decision."* This brief is that decision, and it opens the write path as
narrowly as it can: one line, of one file, for four of the six columns.

## Approach

- **`POST /api/status`** in `server.py`, taking `{project, id, state, note}`.
  It resolves the project key to its roadmap dir the same way `BoardSource`
  does, finds `NNN-*.md`, and rewrites the first `**Status:**` line to
  `**Status:** <keyword> — <note>`. Everything else in the file is untouched,
  including a wrapped continuation of the old status line.
- **Drag and drop** in `app.js`, live only when columns are states
  (`Group: state`). Grouping by label, project or release would mean editing a
  different field, which is a different decision.
- **The sentence is typed, not inherited.** A status line is
  `keyword — one or two sentences for a person`; a drag can only know the
  keyword. Carrying the old sentence over would manufacture lines like
  `blocked — shipped last week`, which is worse than no status at all. So the
  drop opens a small box, the old line is shown beneath it for reference, and
  cancelling cancels the move. The Blocked box asks what has to land first.
- **Done is not a drag.** Retiring a brief moves the file into `done/` and, per
  the roadmap rules, un-blocks every brief that depended on it first. That is
  work, not a gesture. Drops on Done are refused with a message saying so, and
  cards already in `done/` do not lift at all.
- **Where the board disagrees with the file.** A card that git promoted into In
  progress still has whatever its file says. Dragging it writes the drop, which
  is right — but a card dragged back to Planned will be promoted again on the
  next scan while the commits are recent. The board says so after the write
  rather than letting it look like a lost edit.

## Safety

The server writes to the repo, so a page on any other site must not be able to
drive it. Three cheap checks, all local: a same-origin `Origin` header, a
custom request header (which forces a CORS preflight that a cross-site form
cannot send), and a `Host` check against the loopback name (DNS rebinding).
`--read-only` turns the whole write path off.

## Acceptance

- [x] Dragging a card between Backlog / Planned / In progress / Blocked rewrites the brief's `**Status:**` keyword
- [x] The drop prompts for the sentence, shows the current status line, and cancelling writes nothing
- [x] Drops on Done are refused with a message; cards in `done/` are not draggable
- [x] Dragging is off unless columns are grouped by state
- [x] Only the `**Status:**` line changes — a wrapped status is replaced whole, the rest of the file is byte-identical (CRLF files stay CRLF)
- [x] Cross-origin and non-loopback requests are rejected; `--read-only` disables the route
- [x] A write that git activity will override says so instead of silently snapping back
- [x] README's "Not in scope" entry is replaced by a description of what the write path does
