# Roadmap: Specifications in their own version control

**Label:** infra
**Status:** backlog — the direction is agreed; the mechanism is still open, so this is not kickoff-ready yet
**Kickoff:** answer the question below first, then start a fresh session with this file as the brief.
**Origin:** 2026-09-09, from "we'll try to put specifications in their own version control, in order to clear the application layer from project-management decisions".

## Goal

Keep the roadmap — briefs, statuses, dependencies, release scope — out of the
repository that holds the code it describes. Today every project keeps
`docs/roadmap/` inside itself, so each scheduling act lands in the code's
history: a status flipped, a ticket retargeted, a release declared, all mixed
into the same branch, the same diff, the same review as the software.

What that costs, concretely:

- **The code history stops being about the code.** Half the commits on `master`
  here are `roadmap: …`. Reading what shipped means reading past what was
  planned.
- **The board dirties the app checkout.** Since task 3 the board writes a
  brief's `**Status:**` line when you drag a card. That write lands in the
  working tree of the *code* repo — planning leaves the app repo dirty in the
  middle of unrelated work.
- **Planning needs a checkout.** To look at a project's tickets you must have
  that project cloned, on some branch, in some state. Which is also why
  browsing remote projects had to become its own task (task 1).
- **Branches fork the plan.** A brief edited on a feature branch is invisible
  on `master` until the merge, and two branches touching the same status line
  conflict over something that was never code.

## The question to settle first

Where the specs live decides everything else, and it is not decided. Three
mechanisms, from least to most disruptive:

1. **Nested repo, ignored by the app repo** — `docs/roadmap/` becomes its own
   git repository and the app's `.gitignore` ignores it. The path never
   changes, so `/roadmap`, the board, and the house rules keep working
   untouched. Cost: a fresh clone of the app has no roadmap at all, and nothing
   reminds you to clone it.
2. **Submodule at the same path** — same as (1) plus a pinned commit in the app
   repo. Cost: submodule ceremony on every clone and update, and the pin puts
   planning back into the code history, which is the thing this brief is trying
   to remove.
3. **One specs repository, a folder per project** — e.g.
   `~/Projects/specs/<project>/…`, with the app repos holding no roadmap at
   all. The cleanest separation, and the board becomes a single-source tool:
   one clone shows every project's tickets, whether or not its code is checked
   out. Cost: the `docs/roadmap/` convention is baked into the `/roadmap`
   command, the board's discovery, the `pending-work-in-roadmap` rule and both
   READMEs; every one of those has to learn a second location.

**Recommendation: (3), with (1) as the fallback if the path change turns out to
be more surgery than it is worth.** (3) is the only one that actually delivers
the goal — under (1) and (2) the specs still sit inside the app checkout and
still travel with it.

## Ripples to handle, whichever way it goes

- `plugins/session-flow/commands/roadmap.md` — the command names
  `docs/roadmap/` throughout; it needs one resolution rule instead ("look here,
  then there"), documented once and used everywhere in the file.
- `tools/roadmap-board/server.py` — `BoardSource` discovers projects by looking
  for `docs/roadmap/` under a root. A specs repo makes discovery *simpler*: one
  root, one folder per project.
- **Task 1 (repo-URL sources) changes shape.** Its whole point is reaching
  roadmaps that are not checked out locally. Under (3) one local clone of the
  specs repo already covers every project, and task 1 shrinks to "read the
  specs repo from its URL" — or stops being needed. Re-read task 1 before
  starting this one, and say what is left of it afterwards.
- `plugins/modus/rules/pending-work-in-roadmap.md` and both READMEs — the path
  appears in prose that a person follows by hand.
- The move itself must preserve history (`git filter-repo --path docs/roadmap`,
  or `git subtree split`), not copy files into a fresh repo. The briefs' own
  history is how a status line's story is read back.
- Bump `session-flow`'s version when its command changes, per README →
  "Changing things".

## Explicitly not

- Moving anything into `<personal-os>`. That repo holds knowledge about the
  person; this is project bookkeeping and stays its own thing.
- A hosted or shared tracker. The specs stay files in git, read by the same
  tools.
- Changing the brief format, the ID rule, or the status keywords. This brief
  moves files; it does not redesign the convention.

## Acceptance

- [ ] The mechanism is chosen and written down here before any file moves
- [ ] modus's own briefs move first, with their history intact, and `/roadmap`
      still lists them by the same IDs
- [ ] The board shows the moved roadmap with no per-project configuration
- [ ] `git log` in the code repo carries no planning-only commits after the move
- [ ] Every place that names `docs/roadmap/` — command, board, rules, READMEs —
      agrees on where specs live
- [ ] Task 1 is re-read and its brief updated to say what is left of it
