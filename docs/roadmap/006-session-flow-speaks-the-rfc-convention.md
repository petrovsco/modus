# Roadmap: session-flow speaks the RFC convention

**Label:** infra
**Status:** in progress — the rule, the template, the command and the catalog are written; the version bump waits on the first migrated repo proving it
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-10, from "we want to adopt the OpenClaw RFC structure, so let's incorporate those rules within the modus repository". Parent decision: task 4.
**Release:** session-flow 1.4.0

## Goal

Teach modus the convention before any project migrates to it, so that all four
migrations copy one written standard rather than each inventing its own.

## What landed

- **`plugins/modus/rules/rfc-convention.md`** — the house rule, replacing
  `pending-work-in-roadmap.md`. Repo layout, the frontmatter fields, the six
  statuses, labels, `depends`, releases, assets, and the two-repo commit
  discipline.
- **`configs/rfcs/`** — `0000-template.md` (the RFC skeleton) and a `README.md`
  covering how to create a `<project>.rfcs` repo, what its own README and
  CLAUDE.md say, and how to migrate an existing `docs/roadmap/`.
- **`plugins/session-flow/commands/roadmap.md`** — `/roadmap` now resolves the
  specs repo (sibling, then workspace, then the old `docs/roadmap/` fallback),
  reads frontmatter, allocates four-digit IDs, and in pickup mode checks that
  *both* repos are clean before starting.
- **`catalog.json`** — `pending-work-in-roadmap` became `rfc-convention`, and a
  new `rfcs-repo` entry carries the repo layout.

## What is left

- **The version bump.** `session-flow` stays at 1.3.0 until release 1.4.0
  ships; the rewritten command only reaches machines after the bump plus
  `claude plugin update session-flow@modus`. Bump it once one real repo has
  been migrated and `/roadmap` has been run against it — not before, because an
  untested command reaching every machine is worse than a stale one.
- **Repos importing the old rule.** `@~/.claude/modus/rules/pending-work-in-roadmap.md`
  now resolves to nothing. Every CLAUDE.md carrying that line needs it swapped
  for `rfc-convention.md` — do it as part of each project's migration.
- **The `/roadmap` name.** It lists RFCs now. Renaming it to `/rfc` is a real
  option and deliberately not taken yet: the name is muscle memory and the
  command still answers "what is on the roadmap".

## Explicitly not

- Migrating any project. That is tasks 8, 9 and 10.
- Teaching the board. That is task 7.

## Acceptance

- [x] The rule states the convention in full, with the OpenClaw borrowings named
- [x] A template exists that a new RFC can be copied from
- [x] `/roadmap` reads a specs repo, and still reads an unmigrated project
- [x] The catalog offers both the rule and the repo layout to `/modus:init`
- [ ] `session-flow` is bumped to 1.4.0 and updated on both machines
- [ ] No repo still imports the `pending-work-in-roadmap` path
