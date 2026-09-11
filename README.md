# modus

*modus operandi* — **how Claude works in my repos.** A personal [Claude Code
plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) plus a
small catalog of configs that plugins can't carry. One source of truth; every
project opts in to what fits.

It sits in a three-layer model:

| Layer | Lives in | Question it answers |
|---|---|---|
| Knowledge about *me* | a private personal knowledge base — its own repo, never named here | What should Claude know about my life? |
| Reusable *tooling* | **this repo** | How should Claude work in my repos? |
| What a project *intends* | `<project>.rfcs` (one per project) | What are we building next, and why? |
| Installed *state* | `~/.claude` + each project's `.claude/` | What's active here, right now? |

## Layout

```
modus/
├── .claude-plugin/marketplace.json   ← the marketplace manifest
├── plugins/
│   ├── modus/                        ← CORE (enable once, user scope):
│   │   ├── commands/init.md          ←   /modus:init
│   │   ├── skills/capture/           ←   the capture watcher skill
│   │   ├── skills/decision-watcher/  ←   life-decision watcher → personal base
│   │   ├── rules/                    ←   house rules (the one true body of each)
│   │   ├── scripts/sync-rules.mjs    ←   SessionStart: refresh each repo's copies
│   │   └── hooks/hooks.json
│   ├── session-flow/                 ← per-project: context guard, memory nudge, /roadmap
│   └── visual-iteration/             ← per-project: Playwright MCP + workflow skill
├── catalog.json                      ← source of truth read by /modus:init
├── configs/                          ← what plugins can't carry:
│   ├── settings/                     ←   permission + global settings fragments
│   ├── mcp/                          ←   secret-bearing MCP templates (placeholders!)
│   ├── environment/                  ←   machine-level fixes (git-ssh-windows)
│   ├── rfcs/                         ←   the RFC template + <project>.rfcs skeleton
│   └── memory/                       ←   auto-memory convention
└── tools/
    └── roadmap-board/                ← local web board over every project's RFCs
```

## Where the specifications live

**`petrovsco/modus.rfcs`**, not this repo. Every project that plans its work
keeps that planning in a separate `<project>.rfcs` repository — the code
repository holds code. The convention is
`plugins/modus/rules/rfc-convention.md` here, and `configs/rfcs/` holds what
you copy to create one.

This repo followed its own rule on 2026-09-10: the ten briefs that were in
`docs/roadmap/` moved to `modus.rfcs` with their history, keeping their numbers
and gaining a fourth digit. Clone it as a sibling — `Projects/modus.rfcs` —
which is where the board looks.

## One-time setup (per machine)

The marketplace is the **GitHub repository**, so a new machine needs no clone
and one command:

```
/plugin marketplace add petrovsco/modus
/plugin        → enable "modus" (user scope)
               → Marketplaces → modus → Enable auto-update
```

Restart. From then on `/modus:init` works in every project, the capture and
decision watchers are armed, and each repo's house-rule copies are refreshed at
session start. **Auto-update is the point of the GitHub source**: it is off by
default for a third-party marketplace, and with it on, a change reaches this
machine by being pushed — Claude Code refreshes the marketplace shortly after a
session starts and the new version loads at the next launch (or on
`/reload-plugins`).

A clone is only needed to *change* modus — the capture skill edits the catalog
and the rules there, and the board reads the sibling `.rfcs` repos:

```
git clone git@github.com:petrovsco/modus.git ~/Projects/modus
```

### Switching a machine that already had the folder source

Verified on WSL, 2026-09-11. The swap drops two things without saying so:

```
/plugin marketplace remove modus      ← also disables modus@modus
/plugin marketplace add petrovsco/modus
claude plugin install modus@modus --scope user
```

`remove` deletes the plugin from `enabledPlugins`, and `add` rewrites the
marketplace entry **without** `autoUpdate`. Re-install the plugin and turn
auto-update on again — neither returns on its own, and a session started in
between runs with no modus plugin at all.

## Per-repo setup

Run **`/modus:init`** in the target repo. It sniffs the stack, recommends
catalog entries, and installs what you pick:

- **plugins** (`session-flow`, `visual-iteration`) → declared in the repo's
  **committed** `.claude/settings.json`: the `modus` marketplace under
  `extraKnownMarketplaces`, the plugins under `enabledPlugins` — nothing copied.
  Committed, not `settings.local.json`, because `*.local.json` is gitignored
  and a declaration that cannot travel with the repo is useless to any reader
  but this machine. **What that buys today is narrower than it looks.** Tested
  2026-09-11: a cloud session *reads* the file — it quoted the declaration back
  — and installed nothing. Its plugin list was empty, its synced-plugin
  directory empty, and the SessionStart hook never ran. So in a cloud sandbox
  you get the **house rules** (committed files, no plugin needed) and none of
  the commands, skills or hooks. Treat the declaration as correct and
  forward-looking, not as a working install path.
- **house rules** → one committed file each in the repo's
  `.claude/rules/modus/`. Edit a rule here → every repo's copy is refreshed at
  its next session start.
- **settings / MCP templates / environment / conventions** → merged or applied
  per the catalog's install steps (the only category that still copies).

## Where specifications live

A project's plan is not part of its code, so it does not live in its code
repository. Each project that plans its work has a second repo named
`<project>.rfcs` — `tekio.rfcs`, `lumi.rfcs`, `yami.rfcs`, `modus.rfcs` —
cloned beside the code (or inside the same workspace folder):

```
<project>.rfcs/
├── rfcs/
│   ├── 0000-template.md      ← copy this to start one
│   ├── 0071-<slug>.md        ← the number is a permanent ID
│   ├── 0071/                 ← optional diagrams and sidecar files
│   ├── done/                 ← retired RFCs, numbers intact
│   └── releases.md           ← the release registry
└── doctrine.md, design-system.md, …   ← standing reference, at the root
```

The shape is [openclaw/rfcs](https://github.com/openclaw/rfcs) — `rfcs/`, the
numbered filenames, the `0000` template, sidecar asset folders, and the
Summary → Motivation → Goals → Non-Goals → Proposal → Rationale → Unresolved
questions skeleton. What is ours: YAML frontmatter carrying a six-keyword
`status` with a `status_note` sentence, a `label`, `depends`, and `release`;
`done/` for both endings; and an `## Acceptance` checklist that decides when a
file may retire. OpenClaw's `issue` and `rfc_pr` fields are dropped — there is
no PR ceremony here.

Why split at all: a code history should answer "what was built". Once planning
sits next to it, half its commits are status flips, a planning edit on a
feature branch is invisible until it merges, and two branches can conflict over
a line that was never code. The rule is `rfc-convention`; the template and repo
skeleton are in `configs/rfcs/`.

## The command and the watchers

| Trigger | What it does |
|---------|--------------|
| `/modus:init` (you) | Interactive checklist: wire catalog configs into the current repo. |
| **capture** skill (the model, or you via `/modus:capture`) | The intake funnel, armed in modus-initialized repos: when it notices a correction, a repeated chore, or permission friction, it proposes a reusable config; hand it an idea directly and it refines, saves, and registers it here. Nothing is written before you approve. |
| **decision-watcher** skill (the model, or you via `/modus:decision-watcher`) | The funnel to the personal knowledge base, armed in every session on a machine where `~/.claude/modus/personal-os` names one: when a life- or project-level decision is settled, it appends the moment to that base's journal — ungated, because capture that asks permission never happens. It never touches the decision log; that promotion gate stays inside the base. **Inert, and silent about its own existence, on every machine without that file.** |

## House rules — how they reach a repo

Always-on behavioral rules (direct-push, build-before-push, session-wrap-up,
no-personal-context, rfc-convention) can't ship inside plugins — rule text isn't
a plugin component. Instead:

1. Rule bodies live once, here, in `plugins/modus/rules/`.
2. A repo opts in by **carrying a copy**: `.claude/rules/modus/<rule>.md`,
   committed. Claude Code loads `.claude/rules/` automatically, so the rule is
   there wherever the repo is — a cloud session, a collaborator's machine, a
   machine with no plugin installed. Having the file *is* the opt-in; deleting
   it is the opt-out.
3. The core plugin's SessionStart hook refreshes those copies from the bodies
   above. It **only refreshes what is already there** — it never adds a rule to
   a repo, that is `/modus:init`'s job. A rule retired here is not deleted from
   a repo behind your back: its copy's body is replaced by a two-line note and
   you remove the file.

Every copy opens with
`<!-- managed by modus — edit the rule in the modus repo, not here -->`, because
editing the copy is the one thing that does not work: the next session start
overwrites it.

The old mechanism was one `@~/.claude/modus/rules/<rule>.md` import line per
rule in a repo's `CLAUDE.md`. It assumed the plugin was installed on the machine
reading the repo — false in a cloud sandbox and for anyone who just clones a
public repo, and both got no rules at all. The hook still publishes to
`~/.claude/modus/rules/` for one release so repos not yet migrated keep working;
then that half goes away.

## How the pieces reinforce each other

```
session-flow: context guard ──at turn end──▶ session-wrap-up rule ──hands off──▶ /roadmap (<project>.rfcs)
                                              │
                                              └── each unit: build-before-push ──▶ direct-push (commit+push)
                                                                                          │
                              session-flow: memory nudge ◀────────git commit──────────────┘
                                                                                          │
                                                                                          ▼
                                                                             auto-memory (memory-protocol)
```

## Tools

`tools/roadmap-board/` — a local JIRA/Trello-style web board over every
project's briefs (ticket IDs, labels, states, releases, full-brief view). Run
`python3 tools/roadmap-board/server.py` → http://127.0.0.1:4830. It reads the
files; the one thing it writes is a brief's `**Status:**` line, when you drag
its card to another column. It still reads the old `docs/roadmap/` layout, so
it cannot yet see this repo's own RFCs now that they live in `modus.rfcs` —
teaching it to read `<project>.rfcs` repos is RFC 0007, and repo-URL sources
are RFC 0001.

## Secrets

MCP templates that need credentials (e.g. Supabase) ship with **placeholders
only**. Never commit a real token; gitignore the consuming project's
`.mcp.json` or inject from the environment. Plugin-root `.mcp.json` files are
committed by design and must stay secret-free.

## Migrating a repo from the agent-nest era

Run `/modus:init` — it detects legacy forms (`.claude/hooks/context-guard.mjs`,
`.claude/commands/roadmap.md`, `@~/.claude/modus/rules/…` import lines, pasted
rule bodies, hook entries in `settings.local.json`) and offers to replace them
with plugin enablement and rule files under `.claude/rules/modus/`. Old id → new
home: `context-guard-hook` / `memory-after-commit-hook`
/ `roadmap-command` → **session-flow plugin**; `mcp-playwright` +
`visual-iteration` rule → **visual-iteration plugin**; other rules keep their
names. The one exception is `pending-work-in-roadmap`, which became
**`rfc-convention`** when planning moved out of the code repo — a CLAUDE.md
still importing the old path imports nothing, so drop that line and copy the
rule in.

## Changing things

- Edit a rule (or anything in a plugin) → **bump that plugin's patch version**
  (`1.3.0 → 1.3.1`) in its `plugin.json`, commit, push, **then
  `claude plugin update <plugin>@modus` on each machine.** Installs are copied
  into a versioned cache (`~/.claude/plugins/cache/…`), so without the bump a
  machine keeps the old copy however often it refreshes. **The push is not the
  whole delivery.** Measured 2026-09-11 with `autoUpdate` on: two fresh
  non-interactive sessions refreshed nothing, and a marketplace refresh moved
  the *catalog* forward while leaving the installed plugin where it was —
  refreshing a catalog and updating a plugin are two operations. Whether an
  interactive session start does it unattended is still under test (RFC 0013);
  until that says otherwise, run the update. Rules then reach repos at the
  following session start via the sync.
- Add anything new → the **capture** skill keeps `catalog.json` and this
  README in sync and bumps the owning plugin's patch version.
- **Minor (and major) versions are planned, never automatic.** Day-to-day work
  moves only the patch digit. A plugin reaches `x.(y+1).0` the same way any
  release does here: declared in `modus.rfcs`'s `rfcs/releases.md` (named
  `<plugin> x.y.0`), scoped by `**Release:**` lines on briefs, and bumped only
  when that release ships — on the user's say-so. **Tag it:**
  `claude plugin tag plugins/<plugin>` then push the tag. The recovery below
  pins a repo to a release tag, so a release that leaves none has nothing to
  pin to — which was true of every release before `modus--v1.4.0`.

## When an auto-update misbehaves

Per-repo version pinning does not exist: `enabledPlugins` takes only
`true`/`false`, a marketplace source takes a branch or tag `ref`, never a sha.
So the recovery is **revert the push, restart the session** — the next
auto-update pulls the revert. To hold one repo back, pin its own
`extraKnownMarketplaces.modus.source` to a `ref` tag from `claude plugin tag`.
