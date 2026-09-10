# Roadmap: modus.rfcs and yami.rfcs — create and move

**Label:** infra
**Status:** planned — the two small ones; modus moves its own briefs, yami starts empty
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-10, the remaining two of the four projects named in the reorganisation. Parent decision: task 4.
**Depends:** 006

## Goal

Both projects get a specs repo, and modus stops being the tool that defines a
convention it does not follow.

## modus

`docs/roadmap/` here holds ten briefs, `done/` and `releases.md` — including
the briefs that describe this very migration. They move to
`shamatoff/modus.rfcs`, cloned to `Projects/modus.rfcs`, with history, and get
converted to frontmatter and four digits exactly as tekio's do (task 8, same
script — write it there, reuse it here).

Two things are specific to modus:

- **The board's own default.** `tools/roadmap-board/server.py` discovers
  projects under a root; once modus's briefs live in `modus.rfcs`, the tool and
  the briefs describing it are in different repos. That is correct, and task 7
  is what makes it work.
- **The README.** Its layout tree lists `docs/roadmap/`; the line goes, and the
  "Where specifications live" section points at `modus.rfcs` as the example.

## yami

Nothing to extract — `shamatoff/yami` is a `CLAUDE.md` and a `README.md`. So
`yami.rfcs` is created empty from `configs/rfcs/`: `rfcs/0000-template.md`,
`rfcs/done/`, `rfcs/releases.md`, a README naming the code repo, and a CLAUDE.md
with the import line. First RFC gets ID 1. This is the cheap end-to-end test of
the convention on a repo with no legacy at all — do yami first, and let it catch
whatever the template gets wrong before tekio's 72 files are converted.

## Explicitly not

- Moving `configs/`, `plugins/` or `tools/` out of modus. Those are the product
  of this repo, not its plan.
- Creating specs repos for projects not named in the decision — bubolazi's
  maintenance page, feya, the archived repos.

## Acceptance

- [ ] `yami.rfcs` exists, created from the template, and `/roadmap` runs against it
- [ ] `modus.rfcs` exists with the full history of `docs/roadmap/`
- [ ] modus's ten briefs are four-digit and frontmatter-headed, numbers unchanged
- [ ] `docs/roadmap/` is gone from this repo and the README no longer names it
- [ ] Both repos have README + CLAUDE.md importing `rfc-convention`
- [ ] The board shows both, and modus's own tasks still resolve by their old IDs
