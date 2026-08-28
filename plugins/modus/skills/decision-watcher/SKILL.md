---
name: decision-watcher
description: Watcher for life- and project-level moments bound for the
  personal OS (the personal knowledge base). Use PROACTIVELY in any session when something
  happens with consequence beyond the current repo — a direction settled with
  a rationale, a standing decision reversed, or a durable fact stated about a
  project or life area. Also use when the user asks to record something to
  the personal knowledge base. Not for code-level choices or reusable agent-config ideas
  (that's capture).
---

# modus decision-watcher — the OS funnel

Catch what happens where it happens and record it in the personal OS. This skill
is pure plumbing: it carries no life content and never decides what the OS
concludes — it records, the OS curates.

## Gate: is the OS on this machine?

Act only if `~/Projects/<personal-os>` exists (on this machine
`~/Projects/<personal-os>`). If it doesn't, this skill is inert —
never mention it. If the current session is already working inside the personal knowledge base,
defer to the OS's own skills instead of this one.

## What counts as a signal

Something with consequence beyond this session and this repo:

- a direction settled with a rationale ("let's go with X because…")
- a standing decision reversed or amended
- a durable fact stated about a project, tool, or life area

NOT signals: code-level choices (the repo's git history and CLAUDE.md own those),
reusable agent-config ideas (the **capture** skill's job), and anything the user
marked private or off the record.

## On signal — write, don't ask

**Append directly to `<os>/journal/log.md`. Do not ask permission.** The OS's
kernel rule 4 makes the journal ungated on purpose: it is the capture layer, it
is allowed to be messy, and an entry that turns out not to matter costs nothing.
Asking first is what caused this watcher to never fire once between 2026-08-25
and 2026-08-28 — the interruption was never worth it in the moment, so the
capture never happened.

1. Read the format from the OS itself: the preamble of `<os>/journal/log.md`
   defines the entry shape; recent entries show the domain tags in use. Never
   hardcode either here.
2. Append one line under `## Entries`, newest at the bottom:
   `YYYY-MM-DD | [domain or project] | what happened | why it matters`
   Best-guess the domain tag. A wrong guess is cheap and fixable; a missing
   entry is not.
3. Say in one short line that you recorded it and where. No ceremony, no
   confirmation request.

Leave the file uncommitted — the OS repo is Peter's to commit.

## What you must NOT do

- **Never touch `<os>/decisions/log.md`.** Promotion from journal to decision log
  is the OS's own gate and needs Peter's explicit approval, in a the personal knowledge base
  session. Sessions record; Peter decides.
- Never touch `<os>/wiki/`, `<os>/sources/` or `<os>/context/` from here — those
  belong to `/ingest`, run inside the OS.
- Never write a secret, or any personal detail beyond what the user just said,
  into the journal.

## The division of labour

This watcher catches **conversation-only** moments — things said that never touch
a repo. Anything that *did* touch a repo is caught anyway by the OS's own
`/sweep`, which reads git history retroactively and cannot be forgotten. So when
in doubt about a commit-shaped thing, stay quiet: sweep has it covered. Speak up
for the things that would otherwise vanish.
