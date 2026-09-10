# Roadmap: Specifications in their own version control

**Label:** infra
**Status:** in progress — the mechanism is decided and the convention now lives in modus; the per-project moves are tasks 8, 9 and 10
**Kickoff:** this brief is the decision record; the work is in its children.
**Origin:** 2026-09-09, from "we'll try to put specifications in their own version control, in order to clear the application layer from project-management decisions". Decided 2026-09-10 after several sessions comparing options.

## The decision

**One `<project>.rfcs` repository per project, shaped like
[openclaw/rfcs](https://github.com/openclaw/rfcs).** Not a nested repo, not a
submodule: a repository of its own, cloned beside the code repo or inside the
same workspace folder. Four projects get one — `lumi.rfcs` (exists),
`tekio.rfcs`, `yami.rfcs`, `modus.rfcs`.

What comes from OpenClaw: the `rfcs/` folder, `NNNN-<slug>.md` filenames, the
`0000-template.md`, sidecar `NNNN/` asset folders, and the Summary → Motivation
→ Goals → Non-Goals → Proposal → Rationale → Unresolved questions skeleton.
What stays ours: the six-keyword `status` with a `status_note` sentence, the
four labels, `depends`, `release`, `done/` for both endings, and the
`## Acceptance` checklist. Dropped: OpenClaw's `issue` and `rfc_pr` — there is
no PR ceremony here.

Each repo also holds the project's **standing reference** at its root —
doctrine, design system, schema, product description — because those are
specification too, and splitting them from the RFCs that change them would put
the two halves in different repositories.

## Goal

Keep the roadmap — briefs, statuses, dependencies, release scope — out of the
repository that holds the code it describes. Today every project keeps
`docs/roadmap/` inside itself, so each scheduling act lands in the code's
history: a status flipped, a ticket retargeted, a release declared, all mixed
into the same branch, the same diff, the same review as the software.

What that costs, concretely:

- **The code history stops being about the code.** Half the commits on `master`
  here are `roadmap: …`. Reading what shipped means reading past what was
  planned.
- **The board dirties the app checkout.** Since task 3 the board writes a
  brief's `**Status:**` line when you drag a card. That write lands in the
  working tree of the *code* repo — planning leaves the app repo dirty in the
  middle of unrelated work.
- **Planning needs a checkout.** To look at a project's tickets you must have
  that project cloned, on some branch, in some state. Which is also why
  browsing remote projects had to become its own task (task 1).
- **Branches fork the plan.** A brief edited on a feature branch is invisible
  on `master` until the merge, and two branches touching the same status line
  conflict over something that was never code.

## Children

| Task | |
|---|---|
| 6 | session-flow speaks the RFC convention — the rule, the command, the template |
| 7 | the roadmap board reads `<project>.rfcs` repos and YAML frontmatter |
| 8 | tekio: extract 72 briefs plus doctrine, design system and grounding |
| 9 | lumi.rfcs: align the repo that already exists |
| 10 | modus.rfcs and yami.rfcs: create and move |

## Explicitly not

- Moving anything into `<personal-os>`. That repo holds knowledge about the
  person; this is project bookkeeping and stays its own thing.
- A hosted or shared tracker. The specs stay files in git, read by the same
  tools.
- Changing what a brief *says* during the move. Converting a header is not a
  licence to rewrite the argument.

## Acceptance

- [x] The mechanism is chosen and written down before any file moves
- [x] The convention is in modus: a house rule, a template, a catalog entry
- [ ] All four projects have a specs repo, and no code repo still carries
      `docs/roadmap/`
- [ ] `git log` in each code repo carries no planning-only commits after the move
- [ ] The board shows every migrated project with no per-project configuration
- [ ] Task 1 is re-read and its brief updated to say what is left of it
