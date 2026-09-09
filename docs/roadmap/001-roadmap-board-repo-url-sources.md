# Roadmap: Roadmap board — repo-URL sources

**Label:** feature
**Status:** planned — the local-scanning POC shipped first (`tools/roadmap-board/`); remote sources not started
**Kickoff:** start a fresh session with this file as the brief.
**Origin:** 2026-08-29, split out when the board POC was built — the ask was "locally as a POC, later on also with repo URL".

## Goal

Browse the same board for projects that are **not checked out locally**: point
the board at one or more repo URLs and see their `docs/roadmap/` tasks next to
the local projects — same cards, IDs, labels, states.

## Approach sketch (from the POC)

- `server.py` builds the board through `BoardSource.build()`, which returns a
  list of per-project dicts (`name`, `key`, `path`, `nextId`, `tasks[]`). That
  is the seam: a remote source must produce the same dicts and everything
  downstream (API, UI) works unchanged.
- Two candidate mechanisms, not mutually exclusive:
  - **Shallow sparse clone** — `git clone --depth 1 --filter=blob:none --sparse`
    into a cache dir, sparse-checkout only `docs/roadmap/`; refresh = `git fetch`
    + checkout. Works for any git host, needs git on the machine.
  - **GitHub contents API** — no git needed, works from anywhere, but one
    request per file, rate limits, and a token for private repos.
- CLI shape: `--repo <url>` (repeatable), cache under `~/.cache/roadmap-board/`,
  a refresh TTL of a few minutes so the Refresh button doesn't hammer the remote.
- Auth for private repos comes from the environment (e.g. `GITHUB_TOKEN`) —
  never stored in this repo.

## Task 4 may shrink this

If the specs move into one repository of their own (task 4), a single local
clone already covers every project whether or not its code is checked out, and
this brief shrinks to "read that repo from its URL" — or stops being needed at
all. Re-read task 4 before starting here.

## Explicitly not

- No write path (creating/moving briefs from the browser) — separate decision.
- No hosting the board anywhere shared; it stays a local tool for now.
