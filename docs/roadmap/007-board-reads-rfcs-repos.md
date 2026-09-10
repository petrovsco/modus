# Roadmap: Roadmap board reads `<project>.rfcs` repositories

**Label:** feature
**Status:** planned — the convention exists (task 6); the board still only understands `docs/roadmap/`
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-09-10, split out of task 4 — the board is the one tool that reads every project's plan, so it has to learn the new home first.
**Depends:** 006

## Goal

Point the board at the projects root and have it find `*.rfcs/rfcs/` the way it
currently finds `*/docs/roadmap/` — same cards, same IDs, same columns — while
projects that have not migrated yet keep showing up unchanged.

## Approach

- **Discovery.** `BoardSource` walks the root looking for `docs/roadmap/`.
  Add `<anything>.rfcs/rfcs/` to that search, and derive the project name by
  stripping the `.rfcs` suffix — so `tekio.rfcs` shows as **tekio**, next to
  the code repo of the same name rather than as a second project. Workspace
  nesting already works and must keep working (`lumi-workspace/lumi.rfcs`).
- **Two parsers, one shape.** `parse_brief` reads `**Key:**` lines today. Add a
  frontmatter reader for files that open with `---`, mapping `status`,
  `status_note`, `label`, `depends`, `release` onto the exact same per-task
  dict. Everything downstream — API, columns, filters, the release view — then
  works unchanged. Which parser runs is decided per file, not per project, so a
  half-migrated folder still renders.
- **Four-digit IDs.** `TASK_RE` matches three digits. Widen it to three *or*
  four so both layouts resolve, and keep displaying the ID with leading zeros
  dropped (`0071` → `#71`).
- **The write path follows.** Dragging a card rewrites `**Status:**` today. For
  a frontmatter file it must rewrite the `status` field *and* `status_note`,
  and bump `last_updated` — the convention says any edit does. Task 5 (drag to
  change the release) lands on the same helper, so do this one first and let 5
  build on the field writer rather than the line writer.
- **`0000-template.md` is not a ticket.** It carries a number, so the furniture
  rule ("no `NNNN-` prefix means not an RFC") does not exclude it. Exclude
  `0000` explicitly.

## Explicitly not

- Reading specs repos over the network — that is still task 1.
- Rendering the root-level reference docs (doctrine, design system). The board
  shows RFCs; the reference lives beside them, not in the columns.

## Acceptance

- [ ] The board finds `<project>.rfcs/rfcs/` under the root, alongside plain and workspace-nested repos
- [ ] A `.rfcs` repo shows under the project's own name, not `tekio.rfcs`
- [ ] Frontmatter and bold-line briefs both render, mixed in one folder if need be
- [ ] Three- and four-digit IDs both resolve; `0000-template.md` is never a card
- [ ] Dragging a frontmatter card rewrites `status` + `status_note` and bumps `last_updated`, leaving the rest byte-identical
- [ ] Both READMEs describe the layouts the board understands
