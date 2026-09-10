---
title: <Title>
authors: [<Name>]
created: <YYYY-MM-DD>
last_updated: <YYYY-MM-DD>
status: backlog
status_note: <one or two sentences on where this actually stands>
label: <bug | infra | feature | backlog>
depends: []
release:
---

# RFC <NNNN>: <Title>

> Copy this file to `NNNN-<slug>.md`, four digits, where NNNN is one higher than
> the highest number across `rfcs/` and `rfcs/done/`. Delete `depends` and
> `release` if they are empty, and delete this block.
>
> Sidecar material — diagrams, screenshots, inventories, long checklists — goes
> in a sibling folder named `NNNN/` and is referenced with a relative path:
> `![](NNNN/architecture.png)` or `[Inventory](NNNN/inventory.md)`.

## Summary

One paragraph: what changes.

## Motivation

Why it is worth doing, and what goes wrong while it is not done.

## Goals

What success looks like.

## Non-Goals

What this deliberately does not touch. The fence around the work — write it
before starting, not after the scope has already crept.

## Proposal

What is actually changing, concretely enough that a fresh session could start
from this file alone.

## Rationale

The alternatives considered, and why this one won.

## Acceptance

- [ ] Each box is testable, and ticking it needs evidence rather than a feeling
- [ ] All boxes ticked → `status: done` and the file moves to `done/`

## Unresolved questions

What is still open. Entries here mean the RFC is not kickoff-ready: it needs a
decision first. Empty is the goal — say so explicitly rather than deleting the
section.
