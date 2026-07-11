# Convention: Auto-memory protocol

**Type:** working convention (a way of using the harness's file-based memory), not a
file you copy into a repo. It's cross-project and mostly environment-level.
**Pairs with:** the `memory-after-commit-hook` (which reminds you to review memory
after each commit).

---

## What it is

A persistent, file-based memory kept **outside** any project repo, at:

```
~/.claude/projects/<project-slug>/memory/
  MEMORY.md              # the index — one line per memory, loaded every session
  <slug>.md              # one fact per file, with frontmatter
```

Each memory file is a single fact with frontmatter:

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary — used to decide relevance during recall>
metadata:
  type: user | feedback | project | reference
---

<the fact. For feedback/project, follow with **Why:** and **How to apply:** lines.
Link related memories with [[their-name]].>
```

## Types

- **user** — who the user is (role, expertise, preferences).
- **feedback** — guidance on how to work (corrections + confirmed approaches). Include the *why*.
- **project** — ongoing work, goals, constraints not derivable from code or git history. Convert relative dates to absolute.
- **reference** — pointers to external resources (URLs, dashboards, tickets).

## Rules of thumb

- **One fact per file.** Add a one-line pointer in `MEMORY.md` (`- [Title](file.md) — hook`).
- **Don't duplicate the repo.** Skip what code structure, git history, or CLAUDE.md already record. If asked to remember such a thing, save what was *non-obvious* about it instead.
- **Update, don't fork.** Before saving, check for an existing file that covers it; edit that. Delete memories that turn out wrong.
- **Verify on recall.** A recalled memory reflects what was true when written — if it names a file/flag/function, confirm it still exists before acting on it.
- **Review after each commit.** Treat every commit as a checkpoint to capture anything worth keeping (this is what the `memory-after-commit-hook` automates).

> Note: the memory *mechanism* is provided by the harness/system prompt. This doc
> captures the *conventions* so they stay consistent across projects.
