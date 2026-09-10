# Roadmap: lumi.rfcs — align the repo that already exists

**Label:** infra
**Status:** planned — the repo is real and in use; it predates the convention and does not follow it yet
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-10, from the reorganisation across the petrovsco / bubolazi / shamatoff accounts. Parent decision: task 4.
**Depends:** 006

## Goal

`bubolazi/lumi.rfcs` becomes the reference example of the convention instead of
the one repo that invented its own version of it.

## What is there now

Everything sits inside `rfcs/`, and none of it is a numbered RFC:
`PRODUCT.md`, `DESIGN.md`, `STACK.md`, `GAMIFICATION.md`, `SECURITY.md`,
`ACTIVITIES.md`, `ROADMAP.md`, `SETUP_BE.md`, `DEPLOYMENT_BE.md`,
`SPECIFICATION_INDEX.md`, `SCHEMA.xml`, plus `lore/` and `prototypes/`. The
folder was renamed from `specs/` to `rfcs/` in its last commit, which is the
whole of the adoption so far.

## Approach

- **Sort reference from work.** Under the convention `rfcs/` holds numbered
  proposals and the root holds standing reference. Almost all of the above is
  reference and moves up one level; `lore/` and `prototypes/` go with it.
- **`ROADMAP.md` is the exception** — it is pending work in a reference
  document, which the rule explicitly forbids. Split it: each item becomes a
  numbered RFC in `rfcs/`, carrying the whole argument rather than a summary,
  and the file is deleted with its content distributed, not archived.
- **Seed the IDs once**, in creation order, then never renumber. If lumi's work
  already carries a sequence of its own (`LUMI-23`, `mvp-u9` — both appear in
  its CLAUDE.md and commit messages), adopt *those* numbers instead of counting
  from 1; matching what is already in the user's head is the whole point of an
  ID.
- **`SPECIFICATION_INDEX.md`** is furniture and stays, repointed at the new
  paths.
- **CLAUDE.md** in the specs repo shrinks to the import line plus what is true
  about *this* repo; the long architecture section describing the code belongs
  in the code repo's own CLAUDE.md, and much of it is reference that should be a
  root document here instead. Decide per section, do not bulk-move.

## Explicitly not

- Touching the lumi code repos (`lumi/`, `api/`, `terminal-server/`).
- Rewriting the specifications themselves. This is a move and a split, not an
  edit of what they say.
- The Claude Design prototypes, which stay where they are and keep their link.

## Acceptance

- [ ] Reference documents sit at the repo root; `rfcs/` holds only numbered RFCs plus its furniture
- [ ] `ROADMAP.md` is gone and every item it held is an RFC with an ID
- [ ] IDs follow whatever sequence lumi already used, padded to four digits
- [ ] `0000-template.md` and `rfcs/done/` exist
- [ ] The repo's CLAUDE.md imports `rfc-convention` and says only what is true of this repo
- [ ] `/roadmap` lists lumi from it
