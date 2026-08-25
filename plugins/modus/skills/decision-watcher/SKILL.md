---
name: decision-watcher
description: Watcher for life- and project-level decisions bound for the
  personal OS (the personal knowledge base). Use PROACTIVELY in any session when the user
  settles something with consequence beyond the current repo — commits to a
  direction with a rationale, reverses a standing decision, or states a
  durable fact about their projects or life. Also use when the user asks to
  log a decision to the personal knowledge base. Not for code-level choices or reusable
  agent-config ideas (that's capture).
---

# modus decision-watcher — the OS funnel

Catch decision-shaped moments where they happen and stage them for the
personal OS. This skill is pure plumbing: it carries no life content and
never decides what enters the OS — it drafts, the user gates.

## Gate: is the OS on this machine?

Act only if `~/Projects/<personal-os>` exists (on this machine
`~/Projects/<personal-os>`). If it doesn't, this skill is
inert — never mention it. If the current session is already working inside
the personal knowledge base, defer to the OS's own `log-decision` skill instead of this one.

## What counts as a signal

A choice with consequence beyond this session and this repo:

- a direction settled with a rationale ("let's go with X because…")
- a standing decision reversed or amended
- a durable fact stated about a project, tool, or life area

NOT signals: code-level choices (the repo's git history and CLAUDE.md own
those), reusable agent-config ideas (the **capture** skill's job), and
anything the user marked private or off the record.

## On signal

1. Read the kernel format from the OS itself: the preamble of
   `<os>/decisions/log.md` defines the entry shape and approval rule; recent
   entries show the domain tags in use. Never hardcode either here.
2. Draft the entry in that format — best-guess domain tag, flagged as a
   guess if unsure — plus one short paragraph of context.
3. Show the draft and ask: stage it for the OS? **Never write before the
   user says yes.** "No" is a complete answer — drop it without ceremony.
4. On yes, write ONE file to `<os>/inbox/YYYY-MM-DD-<slug>.md`:

   ```
   # Decision proposal: <slug>
   Proposed entry: `<the drafted log line>`
   Context: <the paragraph — what led to this, in plain words>
   Source: <repo/workspace>, <date>
   Status: awaiting /ingest
   ```

5. Leave it uncommitted and say where it landed. Done — do not run
   `/ingest`, do not touch `decisions/`, `wiki/`, or `sources/`.

## The two gates (why inbox, not the log)

Staging into `inbox/` needs only the quick yes above. **Appending to the
decision log is the OS's own gate**: that happens later, in a the personal knowledge base
session, via `/ingest` or `log-decision`, with fresh approval. This watcher
never shortcuts it — sessions propose; the user approves.

Never write a secret, or any personal detail beyond what the user just
said, into the proposal file.
