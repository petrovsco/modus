# Agent Setup Guide

A summary of the agent customizations developed while working on **tekio**, packaged
so any project can adopt the useful ones. Everything here is **opt-in** — pick per
project via `/nest-init`. This file is the human-readable companion to
[`catalog.json`](./catalog.json) (the machine-readable source of truth the commands
read).

Configs come in a few flavours and live at two levels:

- **Project level** → the repo's own `.claude/` (`commands/`, `hooks/`,
  `settings.local.json`), its `CLAUDE.md`, and its `.mcp.json`.
- **Global level** → your machine's `~/.claude/` (`settings.json`, and the per-project
  memory store).

---

## The catalog at a glance

| id | Title | Category | Scope | Recommend when |
|----|-------|----------|-------|----------------|
| `session-wrap-up` | Session context wrap-up protocol | rule | project | Build + commit workflow, long sessions |
| `context-guard-hook` | Context-budget wrap-up guard | hook | project | Always useful; pairs with session-wrap-up |
| `memory-after-commit-hook` | Memory review after commit | hook | project | Git repo + auto-memory in use |
| `roadmap-command` | `/roadmap` command + `docs/roadmap/` | command | project | Accrues future-work briefs; clean handoffs |
| `memory-protocol` | Auto-memory protocol | convention | global | Any ongoing project |
| `npm-permissions` | Safe permission allowlist | settings | project | Node/npm projects |
| `global-settings` | Model / effort / notifications | settings | global | Set once per machine |
| `mcp-playwright` | Playwright MCP server | mcp | project | Web/UI or visual work |
| `mcp-supabase` | Supabase MCP server | mcp | project | Project uses Supabase 🔐 |
| `visual-iteration` | Visual iteration workflow | rule | project | Hand-tuned SVG/charts/components |
| `direct-push` | Direct-to-main + auto-checkpoint | rule | project | Solo/trunk-based repos (confirm first) |
| `build-before-push` | Build before pushing | rule | project | Any project with a build step |
| `git-ssh-windows` | Git SSH push fix (Windows) | environment | global | SSH pushes fail from Git Bash on Windows |

---

## Hooks

### `context-guard` — context-budget wrap-up guard
A `PostToolUse` hook ([`configs/hooks/context-guard.mjs`](./configs/hooks/context-guard.mjs))
that reads the live transcript's token `usage` and, when the context window crosses
a **soft (~180k)** or **hard (~195k)** threshold, injects a "wrap up now" instruction
back into the model. It costs **zero model tokens** (local code, tail read only) and
de-bounces to at most once per tier per session. Thresholds are env-tunable
(`CTX_GUARD_SOFT`, `CTX_GUARD_HARD`); the roadmap dir it points at is
`CTX_GUARD_ROADMAP_DIR` (default `docs/roadmap/`).

> **Install note:** Claude Code does not expand `~` or `$VARS` inside a hook command
> — use the real absolute path to the copied `.mjs`.

### `memory-review-after-commit` — capture learnings at each checkpoint
A `PostToolUse` (matcher `Bash`) hook that detects a `git commit` in the tool input
and nudges the agent to review the session and update auto-memory. The wiring for
both hooks lives in [`configs/hooks/settings.hooks.json`](./configs/hooks/settings.hooks.json)
— merge its `PostToolUse` array into your `settings.local.json` (append; don't
clobber an existing array).

## Commands

### `/roadmap` — deterministic task briefs
[`configs/commands/roadmap.md`](./configs/commands/roadmap.md). Future work is stored
as one markdown file per task under `docs/roadmap/`; the command lists them with
**stable IDs** (files sorted alphabetically → numbered) so "task 3" means the same
thing in every session, or picks one up as a kickoff brief. This is the landing spot
for the `session-wrap-up` protocol's handoffs.

## Rules (CLAUDE.md snippets)

- **`session-wrap-up`** — work in atomic build-passing units, checkpoint each
  (build → commit → push), and when context fills, finish the current unit and hand
  the rest off to a `docs/roadmap/` brief. Triggered automatically by `context-guard`.
- **`build-before-push`** — run the *full build* the deploy runs (not just a
  typecheck) before committing; the build catches what a typecheck misses.
- **`direct-push`** — push straight to main and auto commit+push finished,
  build-passing units without being asked. **Opt-in per repo** — only for solo /
  trunk-based repos, never where PR review or protected branches apply.
- **`visual-iteration`** — serve scratch HTML/SVG over HTTP (Playwright MCP blocks
  `file://`), iterate with element screenshots, and clean up scratch files after.

## MCP servers

Defined in a project's `.mcp.json`.

- **`mcp-playwright`** — browser automation + screenshots; no secrets. Point
  `--output-dir` at a folder inside the project.
- **`mcp-supabase`** — inspect/query a Supabase project. 🔐 **Takes an `sbp_` access
  token — never commit it.** Gitignore `.mcp.json` or inject the token from a secret
  store. Templates use placeholders.

## Settings

- **`npm-permissions`** (project) — a small, safe allowlist (e.g. `Bash(npm run *)`)
  so the agent isn't prompted for routine commands. Grow it later with
  `/fewer-permission-prompts`. (The original workspace also had one-off nvm/winget
  machine-bootstrap allowances — deliberately **not** packaged here; those are
  environment setup, not a reusable policy.)
- **`global-settings`** (global) — `~/.claude/settings.json`: `model: opus`,
  `effortLevel: xhigh`, `agentPushNotifEnabled: true`.

## Environment (machine-level)

- **`git-ssh-windows`** (global) — on Windows + Git Bash, SSH `git push` fails/hangs
  in **every** repo because Git Bash's bundled OpenSSH doesn't share the Windows key
  agent — the key is never the problem. Fix it once, globally, by pointing git at the
  Windows-native binary: `git config --global core.sshCommand "C:/WINDOWS/System32/OpenSSH/ssh.exe"`.
  Because it's global, every current and future clone inherits it; a per-repo setting
  only fixes that one clone. See
  [`configs/environment/git-ssh-windows.md`](./configs/environment/git-ssh-windows.md).

## Conventions

- **`memory-protocol`** (global) — file-based persistent memory kept **outside** the
  repo at `~/.claude/projects/<slug>/memory/`: one fact per file (frontmatter with
  `type: user|feedback|project|reference`) + a `MEMORY.md` index loaded each session.
  See [`configs/memory/README.md`](./configs/memory/README.md) for the full rules of
  thumb. Pairs with `memory-after-commit-hook`.

---

## How the pieces reinforce each other

```
context-guard hook ──fires──▶ session-wrap-up protocol ──hands off──▶ /roadmap (docs/roadmap/)
                                        │
                                        └── each unit: build-before-push ──▶ direct-push (commit+push)
                                                                                    │
                                        memory-after-commit hook ◀──git commit──────┘
                                                                                    │
                                                                                    ▼
                                                                          auto-memory (memory-protocol)
```

## Applying this to a new project

Run **`/nest-init`** in the target project — it sniffs the stack, recommends the
relevant catalog entries, and installs the ones you pick. See the
[README](./README.md) for the command reference and one-time install of the `nest-*`
commands.
