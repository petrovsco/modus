# agent-nest

A cross-project home for reusable **agent configurations** — rules, commands, hooks,
skills, MCP templates, and settings — so every project I work on can adopt the ones
that fit. Some configs make sense for one repo and not another, so setup is a
**checklist**: you opt into each config per project.

## Layout

```
agent-nest/
├── README.md              ← you are here
├── SETUP-GUIDE.md         ← human-readable summary of every config
├── catalog.json           ← machine-readable source of truth (what /nest-init reads)
├── commands/              ← the nest-* commands (install these globally, see below)
│   ├── nest-init.md
│   ├── nest-auto.md
│   └── nest-rule.md
└── configs/               ← the reusable assets themselves
    ├── hooks/             ← context-guard.mjs, settings.hooks.json
    ├── commands/          ← roadmap.md
    ├── rules/             ← CLAUDE.md snippets
    ├── mcp/               ← MCP server templates (secrets = placeholders)
    ├── settings/          ← permission + global settings fragments
    └── memory/            ← auto-memory protocol
```

## The three commands

| Command | What it does |
|---------|--------------|
| `/nest-init` | Reads the catalog, sniffs the current project, and walks you through an interactive checklist to install the configs you pick into this repo (and/or `~/.claude`). |
| `/nest-auto` | Reviews recent work (this session + git history + permission friction) and **suggests** new reusable configs worth capturing. Nothing is written without your OK. |
| `/nest-rule <text>` | Takes a raw rule/idea, **refines it with you**, then saves it as a properly-formatted asset under `configs/…` and registers it in the catalog. |

## One-time install (make the commands available everywhere)

The `nest-*` commands live here (source of truth) but must be copied into your global
commands dir to be callable from any project. On this machine:

```bash
cp commands/nest-*.md ~/.claude/commands/
```

Re-run that after editing a command here to re-sync. (Prefer a symlink if your OS
allows it, so edits are always live.) Then, in any project, run `/nest-init`.

## Secrets

MCP templates that need credentials (e.g. Supabase) ship with **placeholders only**.
Never commit a real token. Gitignore the consuming project's `.mcp.json` or inject
secrets from your environment / a secret store.

## Adding to the catalog

Use `/nest-rule` — it drafts the asset, keeps `catalog.json` valid, and updates
`SETUP-GUIDE.md` so the docs stay in sync. Or edit those files by hand following the
shape of the existing entries.
