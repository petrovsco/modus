# roadmap-board

A local JIRA/Trello-style web board over every project's
`docs/roadmap/` — the modus roadmap convention (one brief per task named
`NNN-<slug>.md`, finished briefs retired to `done/` keeping their ID, a
`**Label:**` line and a free-text `**Status:**` line under the title).

Python 3.8+ stdlib only. It is Python (not `.mjs` like the rest of the repo)
because the tool must run on machines where WSL has no Node — Python is the
runtime that is always there.

## Run

```bash
python3 tools/roadmap-board/server.py
```

→ open **http://127.0.0.1:4830**

With no arguments it scans the folder two levels above this repo (i.e.
`~/Projects`) for `*/docs/roadmap` and `*/*/docs/roadmap` — that picks up both
plain repos (`tekio/docs/roadmap`) and workspace-nested ones
(`lumi-workspace/lumi/docs/roadmap`). Alternatives:

```bash
python3 server.py ~/Projects/tekio            # explicit projects only
python3 server.py --root /some/other/folder   # discover under a different root
python3 server.py --port 5000
python3 server.py --read-only                 # refuse the one write (see below)
```

The scan happens on every `/api/board` request, so the **Refresh** button in
the page always shows the current state of the files. Binds to 127.0.0.1 only.

It is a read of the files everywhere except one gesture: dragging a card
between columns rewrites that brief's `**Status:**` line, and nothing else.
See **Dragging a card** below, or pass `--read-only` to switch it off.

## What the board shows

- **Cards** carry the permanent ticket ID (`#7`), title, label chip
  (bug / infra / feature / backlog), release chip (`2.0.0`) when the brief has
  a `**Release:**` line, the status line, and the project. Clicking a card
  renders the full brief (markdown), with links between briefs opening the
  linked task.
- **Columns** are derived from the `**Status:**` line's leading keyword:
  Backlog (parked, TBC, shelved, on hold, someday — everything not committed
  to yet) · Planned (also "ready", "agreed", "proposed", "settled") ·
  In progress (also "shipped" — on an active brief that means partially
  shipped) · Blocked · Other (unrecognized) · Done (anything in `done/`,
  regardless of its status text). Group by label or project instead via the dropdown.
- **Discarded** is the second way out of `done/`. That directory holds what
  shipped *and* what was dropped — both keep their number, neither is deleted —
  so a brief there whose status starts `discarded` (or `dropped`, `abandoned`,
  `won't do`) stays in the Done column but wears a **discarded** chip, and the
  list and detail panel say Discarded rather than Done. It is a state, not a
  label: the label still says what kind of work it was.
- **Activity** overrides the status line where they disagree, because a Status
  line records what was *decided* and git records what was *done*. See below.
- **Filters**: project chips (tooltip shows the roadmap path and the next free
  ID), label chips, release chips (tooltip shows status and target; the row
  appears only once something declares or names a release), full-text search
  (title, status, body, `#id`), a done toggle, and a list view for JIRA-style
  table browsing.
- **Deep links**: opening a task sets the URL hash — `#tekio:7` opens tekio
  task 7 directly (nested projects URL-encode the key, e.g.
  `#lumi-workspace%2Flumi:1`). Views are bookmarkable too:
  `?view=releases`, `?group=release`, etc.
- Furniture (`README.md`, shared-context files — any `.md` without a `NNN-`
  prefix) is ignored, as `/roadmap` does. A brief that predates the label
  convention shows as `—`.

## Releases — the Jira version view

A brief opts into a release with one optional header line, kept when the brief
retires to `done/` (that is what keeps a shipped release's scope browsable):

```markdown
**Release:** 2.0.0
```

The registry is `docs/roadmap/releases.md` — furniture, so `/roadmap` never
mistakes it for a task. One `##` section per release; **the heading text is the
release name**, exactly as briefs spell it. `**Target:**` is a free-form date,
`**Status:**` is `planned` (default) or `released <date>`, the first paragraph
is the description, and file order is display order.

The **Releases** view shows, per project, one panel per release: status and
target pills, a progress bar (done · in progress · remaining), the description,
and the tickets sorted working-first. A release named only by briefs shows as
*undeclared*; open tickets with no release land in a collapsed **Unscheduled**
panel — that pile is the planning inbox. The view always includes done tickets
whatever the done toggle says, because the progress bar means nothing without
them. The board can also group columns by release (`Group: release`), and
release names are searchable.

**Filtering by release** works like the project and label rows: click a chip to
narrow every view to that release (chips are additive; **no release** selects
the unscheduled pile). The filter narrows the release-grouped columns and the
Releases view's panels too, so picking one release shows that release rather
than a page of empty ones.

The `**Release:**` line may carry a note after a spaced dash —
`**Release:** 2.0.0 — tagged because …` — the same "value — sentence" habit the
`**Status:**` line uses; only the part before the dash is the release name. A
hyphen inside a name (`2.1.0-beta`) is not a separator.

Nothing here is written back either: scheduling a ticket into a release means
editing its `**Release:**` line.

## Observed activity — the column the files don't declare

A brief still reading `**Status:** planned` that has had thirteen commits this
week is in progress whatever it says, and a brief reading `in progress` that
nobody has touched in a month is not. So the board reads git as well as the
files:

- Commits are attributed to a task two ways — the commit **touched**
  `docs/roadmap/NNN-*.md`, or its **subject named the task** (`roadmap 018`,
  `task 7`, `brief #12`; a bare `#12` is ignored, it collides with PR numbers).
  The second one is what catches code commits like `feat(roadmap 019): …`.
- A commit touching **8 or more briefs** is bookkeeping — a relabelling or
  renumbering sweep — and is dropped, so it cannot light up every card at once.
- **Writing the brief is not doing the work.** A commit whose subject starts
  `docs(...)` counts as brief activity; anything else counts as code. Only code
  moves a card into In progress — without that rule a brief created this morning
  showed up as in progress this afternoon. Doc-only activity still shows on the
  card, labelled *the brief only, no code*.
- A commit in the last **7 days** makes a task *active*. An active task in
  Backlog, Planned or Other is **moved into In progress** and marked `MOVED
  HERE`; its card shows the commit count, how long ago, and the last commit
  subject. In progress is sorted most-recently-worked first.
- A task whose status *declares* in progress but has no activity is marked
  **stale** — that is the "which of these am I actually doing?" answer.
- Nothing is written back to the brief. To make the board's guess permanent,
  drag the card (below) or edit the `**Status:**` line yourself.

The scan is two git calls per repo (a path-limited `--name-only` log over the
roadmap folder, plus a `--grep` log with no diff at all) over a 90-day window,
cached per repo `HEAD` — so **Refresh** only pays for it again after a commit
lands. Pass `--no-git` to turn the whole thing off and let the `**Status:**`
line stand alone.

## The AI Roadmap — what to do next

The board answers *where does everything stand*. With twenty open briefs that is
not the question you actually have, which is **what do I do next**. The third
view answers that one: every open task, in one proposed order, in four bands.

| Band | Rule |
|---|---|
| **Now** | started, and nothing is in the way |
| **Next** | committed, unblocked, nobody on it — where a fresh session starts |
| **Later** | something has to land first; the blocker is named on the row |
| **Someday** | not committed to; it needs a decision, not a slot |

The band is a **rule**, not a score — a blocked task cannot outrank its way into
Now. The score only orders rows *within* a band, and it is deliberately small
enough to read off the row: state, label, observed code activity, how deep the
task sits under its blockers, and how much other work it unblocks. Every row
carries the sentence that explains its placement, because a running order you
cannot interrogate is a running order nobody follows.

**Nothing is written back to the briefs.** Like the board, it is a read.

### `**Depends:**` — the one line that drives it

Order comes first from dependencies you declare, in an optional header line:

```markdown
**Depends:** 018, 019
```

Hard blockers only, by task ID, within the same project. A dependency parks the
brief in Later behind another one, so list what genuinely parks it — a soft
overlap ("check this doesn't fork the same model") belongs in prose. Omit the
line when there is nothing. Dependencies pointing at a task already in `done/`
are ignored, so a brief does not have to be edited when its blocker lands.

## Dragging a card — the one thing that writes

Drag a card into another column and the board rewrites that brief's
`**Status:**` line. That is the whole write path: one line, of one file. The
rest of the brief is left byte-for-byte alone, and a status that wrapped over
two lines is replaced whole rather than leaving its tail behind as a stray
paragraph.

- **The drop asks for the sentence.** A status line is
  `keyword — one or two sentences for a person`; the column only supplies the
  keyword. Carrying the old sentence across would manufacture lines like
  `blocked — shipped last week`, so the drop opens a box, shows the line it is
  about to replace, and cancelling writes nothing. Enter saves, Shift+Enter is
  a newline, Escape cancels.
- **Four columns, not six.** Backlog, Planned, In progress and Blocked.
  *Other* is not a state anything should be moved *into* — it is what an
  unrecognized status falls through to. **Done** is refused with a message,
  because retiring a brief moves the file into `done/` and takes every brief
  that `**Depends:**` on it off blocked first: that is work, not a gesture.
  Cards already in `done/` do not lift at all.
- **Only while columns are states.** Grouped by label, project or release the
  same gesture would have to edit a different field, which is a different
  decision; dragging is simply off there.
- **Where the board and the file disagree.** A card that recent commits pushed
  into In progress carries whatever its file says. Dragging it writes the drop —
  but a card dropped back into Planned while those commits are still inside the
  7-day window is promoted again on the next scan. The board says so after the
  write rather than letting a correct edit look like a lost one.
- **Blocked is half a statement.** The board writes the status keyword; if the
  blocker is another brief, its ID still belongs in a `**Depends:**` line, and
  that is a file edit. The prompt says so.

The server writes to your repo, so a page on any other site must not be able to
drive it. `POST /api/status` requires a loopback `Host` (DNS rebinding), a
same-origin `Origin`, and a request header no cross-site form can set — which
forces a CORS preflight this server does not answer. `--read-only` turns the
route off entirely.

## Not (yet) in scope

- **Repo-URL sources** (browse projects not checked out locally) — planned;
  the brief is `docs/roadmap/001-roadmap-board-repo-url-sources.md`. The seam
  is `BoardSource` in `server.py`: a remote source must produce the same
  per-project dicts the local scanner does.
- Editing anything but the `**Status:**` line — a card's label, release,
  dependencies and title are still file edits, and creating or retiring a brief
  is deliberately not a drag.
