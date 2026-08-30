# roadmap-board

A local, read-only JIRA/Trello-style web board over every project's
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
(`feya-workspace/feyabuild/docs/roadmap`). Alternatives:

```bash
python3 server.py ~/Projects/tekio            # explicit projects only
python3 server.py --root /some/other/folder   # discover under a different root
python3 server.py --port 5000
```

The scan happens on every `/api/board` request, so the **Refresh** button in
the page always shows the current state of the files. Binds to 127.0.0.1 only.

## What the board shows

- **Cards** carry the permanent ticket ID (`#7`), title, label chip
  (bug / infra / feature / backlog), the status line, and the project.
  Clicking a card renders the full brief (markdown), with links between briefs
  opening the linked task.
- **Columns** are derived from the `**Status:**` line's leading keyword:
  Backlog (parked, TBC, shelved, on hold, someday — everything not committed
  to yet) · Planned (also "ready", "agreed", "proposed", "settled") ·
  In progress (also "shipped" — on an active brief that means partially
  shipped) · Blocked · Other (unrecognized) · Done (anything in `done/`,
  regardless of its status text). Group by label or project instead via the dropdown.
- **Activity** overrides the status line where they disagree, because a Status
  line records what was *decided* and git records what was *done*. See below.
- **Filters**: project chips (tooltip shows the roadmap path and the next free
  ID), label chips, full-text search (title, status, body, `#id`), a done
  toggle, and a list view for JIRA-style table browsing.
- **Deep links**: opening a task sets the URL hash — `#tekio:7` opens tekio
  task 7 directly (nested projects URL-encode the key, e.g.
  `#feya-workspace%2Ffeyabuild:1`).
- Furniture (`README.md`, shared-context files — any `.md` without a `NNN-`
  prefix) is ignored, as `/roadmap` does. A brief that predates the label
  convention shows as `—`.

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
- A commit in the last **7 days** makes a task *active*. An active task in
  Backlog, Planned or Other is **moved into In progress** and marked `MOVED
  HERE`; its card shows the commit count, how long ago, and the last commit
  subject. In progress is sorted most-recently-worked first.
- A task whose status *declares* in progress but has no activity is marked
  **stale** — that is the "which of these am I actually doing?" answer.
- Nothing is written back to the brief. To make the board's guess permanent,
  edit the `**Status:**` line yourself.

The scan is two git calls per repo (a path-limited `--name-only` log over the
roadmap folder, plus a `--grep` log with no diff at all) over a 90-day window,
cached per repo `HEAD` — so **Refresh** only pays for it again after a commit
lands. Pass `--no-git` to turn the whole thing off and let the `**Status:**`
line stand alone.

## Not (yet) in scope

- **Repo-URL sources** (browse projects not checked out locally) — planned;
  the brief is `docs/roadmap/001-roadmap-board-repo-url-sources.md`. The seam
  is `BoardSource` in `server.py`: a remote source must produce the same
  per-project dicts the local scanner does.
- Editing or moving cards from the browser — the files stay the source of
  truth; a write path is its own decision.
