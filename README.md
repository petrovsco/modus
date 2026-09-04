# modus

*modus operandi* — **how Claude works in my repos.** A personal [Claude Code
plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) plus a
small catalog of configs that plugins can't carry. One source of truth; every
project opts in to what fits.

It sits in a three-layer model:

| Layer | Lives in | Question it answers |
|---|---|---|
| Knowledge about *me* | `<personal-os>` (private) | What should Claude know about my life? |
| Reusable *tooling* | **this repo** | How should Claude work in my repos? |
| Installed *state* | `~/.claude` + each project's `.claude/` | What's active here, right now? |

## Layout

```
modus/
├── .claude-plugin/marketplace.json   ← the marketplace manifest
├── plugins/
│   ├── modus/                        ← CORE (enable once, user scope):
│   │   ├── commands/init.md          ←   /modus:init
│   │   ├── skills/capture/           ←   the capture watcher skill
│   │   ├── skills/decision-watcher/  ←   life-decision watcher → the personal knowledge base inbox
│   │   ├── rules/                    ←   house rules (import-ready bodies)
│   │   ├── scripts/sync-rules.mjs    ←   SessionStart: rules → ~/.claude/modus/rules/
│   │   └── hooks/hooks.json
│   ├── session-flow/                 ← per-project: context guard, memory nudge, /roadmap
│   └── visual-iteration/             ← per-project: Playwright MCP + workflow skill
├── catalog.json                      ← source of truth read by /modus:init
├── configs/                          ← what plugins can't carry:
│   ├── settings/                     ←   permission + global settings fragments
│   ├── mcp/                          ←   secret-bearing MCP templates (placeholders!)
│   ├── environment/                  ←   machine-level fixes (git-ssh-windows)
│   └── memory/                       ←   auto-memory convention
├── docs/roadmap/                     ← this repo's own task briefs (NNN-<slug>.md)
└── tools/
    └── roadmap-board/                ← local web board over every project's docs/roadmap/
```

## One-time setup (per machine)

```
git clone git@github.com:petrovsco/modus.git ~/Projects/modus
```

Then in any Claude Code session:

```
/plugin marketplace add ~/Projects/modus
/plugin        → enable "modus" (user scope)
```

Restart. From then on `/modus:init` works in every project, the capture and
decision watchers are armed, and house rules sync to `~/.claude/modus/rules/`
at each session start.

## Per-repo setup

Run **`/modus:init`** in the target repo. It sniffs the stack, recommends
catalog entries, and installs what you pick:

- **plugins** (`session-flow`, `visual-iteration`) → enabled via
  `enabledPlugins` in the repo's `.claude/settings.local.json` — nothing copied.
- **house rules** → one `@~/.claude/modus/rules/<rule>.md` import line each in
  the repo's `CLAUDE.md`. Edit a rule here → every repo follows next session.
- **settings / MCP templates / environment / conventions** → merged or applied
  per the catalog's install steps (the only category that still copies).

## The command and the watchers

| Trigger | What it does |
|---------|--------------|
| `/modus:init` (you) | Interactive checklist: wire catalog configs into the current repo. |
| **capture** skill (the model, or you via `/modus:capture`) | The intake funnel, armed in modus-initialized repos: when it notices a correction, a repeated chore, or permission friction, it proposes a reusable config; hand it an idea directly and it refines, saves, and registers it here. Nothing is written before you approve. |
| **decision-watcher** skill (the model, or you via `/modus:decision-watcher`) | The OS funnel, armed in every session on machines with `<personal-os>` checked out: when a life- or project-level decision is settled, it drafts a kernel-format entry and — with your yes — stages a proposal in `<personal-os>/inbox/` for `/ingest`. It never appends to the decision log itself; that gate stays in the OS. Inert on machines without the OS. |

## House rules — how the import trick works

Always-on behavioral rules (direct-push, build-before-push, session-wrap-up)
can't ship inside plugins — CLAUDE.md content isn't a plugin component. Instead:

1. Rule bodies live once, here, in `plugins/modus/rules/`.
2. The core plugin's SessionStart hook syncs them to `~/.claude/modus/rules/` —
   a **stable, machine-independent path** (plugin-managed; never hand-edit).
3. A repo opts in with one visible line per rule in its `CLAUDE.md`:
   `@~/.claude/modus/rules/direct-push.md`.

Native CLAUDE.md loading, zero copy-paste, no drift. On a machine without the
plugin the imports simply resolve to nothing.

## How the pieces reinforce each other

```
session-flow: context guard ──at turn end──▶ session-wrap-up rule ──hands off──▶ /roadmap (docs/roadmap/)
                                              │
                                              └── each unit: build-before-push ──▶ direct-push (commit+push)
                                                                                          │
                              session-flow: memory nudge ◀────────git commit──────────────┘
                                                                                          │
                                                                                          ▼
                                                                             auto-memory (memory-protocol)
```

## Tools

`tools/roadmap-board/` — a local, read-only JIRA/Trello-style web board over
every project's `docs/roadmap/` briefs (ticket IDs, labels, states, releases,
full-brief view). Run `python3 tools/roadmap-board/server.py` →
http://127.0.0.1:4830. See its README; repo-URL sources are roadmap task 1.

## Secrets

MCP templates that need credentials (e.g. Supabase) ship with **placeholders
only**. Never commit a real token; gitignore the consuming project's
`.mcp.json` or inject from the environment. Plugin-root `.mcp.json` files are
committed by design and must stay secret-free.

## Migrating a repo from the agent-nest era

Run `/modus:init` — it detects legacy copies (`.claude/hooks/context-guard.mjs`,
`.claude/commands/roadmap.md`, pasted rule bodies, hook entries in
`settings.local.json`) and offers to replace them with plugin enablement and
import lines. Old id → new home: `context-guard-hook` / `memory-after-commit-hook`
/ `roadmap-command` → **session-flow plugin**; `mcp-playwright` +
`visual-iteration` rule → **visual-iteration plugin**; rules keep their names.

## Changing things

- Edit a rule (or anything in a plugin) → **bump that plugin's patch version**
  (`1.3.0 → 1.3.1`) in its `plugin.json`, commit, then
  `claude plugin update <plugin>@modus` (per machine). Installs are copied into
  a versioned cache (`~/.claude/plugins/cache/…`) — without the bump + update,
  machines keep the old copy. Rules then reach repos at the next session start
  via the sync.
- Add anything new → the **capture** skill keeps `catalog.json` and this
  README in sync and bumps the owning plugin's patch version.
- **Minor (and major) versions are planned, never automatic.** Day-to-day work
  moves only the patch digit. A plugin reaches `x.(y+1).0` the same way any
  release does here: declared in `docs/roadmap/releases.md` (named
  `<plugin> x.y.0`), scoped by `**Release:**` lines on briefs, and bumped only
  when that release ships — on the user's say-so.
