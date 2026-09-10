# Convention: the `<project>.rfcs` specification repository

**Type:** a repository layout, plus the two files that seed it. The rule that
describes the convention is `plugins/modus/rules/rfc-convention.md`; this folder
holds what you copy when creating the repo.
**Shape borrowed from:** [openclaw/rfcs](https://github.com/openclaw/rfcs) — the
`rfcs/` folder, `0000-template.md`, `NNNN-<slug>.md` naming, sidecar `NNNN/`
asset folders, and the Summary → Motivation → Goals → Non-Goals → Proposal →
Rationale → Unresolved questions skeleton.

---

## Why the specs get their own repository

A code repository should record what was built. The moment planning lives
beside it, its history stops answering that: half the commits are status flips
and re-scoping, a planning edit on a feature branch is invisible on the main
branch until it merges, and two branches can conflict over a status line that
was never code. Splitting them means the code history is about code, the
specification history is about intent, and a tool that reads plans does not need
any code checked out at all.

## Creating one

```bash
gh repo create <owner>/<project>.rfcs --private
git clone git@github.com:<owner>/<project>.rfcs.git
mkdir -p <project>.rfcs/rfcs/done <project>.rfcs/.claude/rules/modus
cp configs/rfcs/0000-template.md <project>.rfcs/rfcs/
cp plugins/modus/rules/rfc-convention.md <project>.rfcs/.claude/rules/modus/
```

Then write the two files below, commit, push.

Where it goes on disk matters: the roadmap board finds specification repos by
looking for `*.rfcs/rfcs/` under the projects root, so clone it as a **sibling
of the code repo** (`Projects/tekio` and `Projects/tekio.rfcs`), or inside the
same workspace folder for a workspace-shaped project
(`Projects/lumi-workspace/lumi.rfcs`).

## `README.md`

Names the code repository it plans, so neither side is an orphan:

```markdown
# <project>.rfcs

Specifications and planning for **<owner>/<project>**. The code lives there;
what we intend to build lives here.

- `rfcs/` — one numbered RFC per unit of work. `0000-template.md` to start one,
  `done/` for retired ones, `releases.md` for the release registry.
- Everything at the root — doctrine, design system, schema — is standing
  reference: what *is*, never what is next.
```

## `CLAUDE.md`

One sentence, because the rule itself is a committed file that Claude Code
loads on its own:

```markdown
# CLAUDE.md

## House rules

The rules in `.claude/rules/modus/` apply to this repo; Claude Code loads them
automatically. They are copies — edit them in the modus repo.
```

The copy that makes this repo follow the convention is
`.claude/rules/modus/rfc-convention.md`, put there by the `cp` above. The code
repo carries the same file — that is what tells a session working on the code
where its RFCs are. Copies are committed, so a cloud session and a reader
without modus installed both see the rules; the plugin's SessionStart hook
refreshes them when the rule changes upstream, and adds nothing you did not
copy in yourself.

The first line of every copy is
`<!-- managed by modus — edit the rule in the modus repo, not here -->`.

## Adopting it in a repo that already has `docs/roadmap/`

Move the files with their history, do not copy them:

```bash
git clone <code-repo> extract && cd extract
git filter-repo --path docs/roadmap/ --path docs/doctrine.md   # etc.
```

Then rename `NNN-<slug>.md` → `NNNN-<slug>.md` (the number is the ID and does
not change — only its padding does), convert each header to frontmatter, and
delete the folder from the code repo in a commit of its own. Rewrite the files
with a script that reads and writes whole files; `sed -i` under Git Bash strips
`\r` and turns a small edit into a whole-file diff on a CRLF repo.
