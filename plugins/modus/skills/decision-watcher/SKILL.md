---
name: decision-watcher
description: Watcher for life- and project-level moments bound for the
  user's personal knowledge base. Use PROACTIVELY in any session when something
  happens with consequence beyond the current repo — a direction settled with
  a rationale, a standing decision reversed, or a durable fact stated about a
  project or life area. Also use when the user asks to record something to
  their personal knowledge base. Not for code-level choices or reusable
  agent-config ideas (that's capture).
---

# modus decision-watcher — the funnel to the personal knowledge base

Catch what happens where it happens and record it in the user's personal
knowledge base. This skill is pure plumbing: it carries no life content and never
decides what that base concludes — it records, the base curates.

## Gate: is a personal knowledge base configured on this machine?

Read `~/.claude/modus/personal-os`. It holds one line: the absolute path to the
base. That path is `<os>` for the rest of this skill.

**On most machines the file does not exist.** If it is missing, unreadable, or
names a path that is not a directory, this skill is **inert** — do nothing, and
never mention that such a base might exist. Do not guess a path, do not search
the filesystem for one, and never write the resolved path into a repo.

If the current session is already working inside `<os>`, defer to that repo's own
skills instead of this one.

## What counts as a signal

Something with consequence beyond this session and this repo:

- a direction settled with a rationale ("let's go with X because…")
- a standing decision reversed or amended
- a durable fact stated about a project, tool, or life area

NOT signals: code-level choices (the repo's git history and CLAUDE.md own those),
reusable agent-config ideas (the **capture** skill's job), and anything the user
marked private or off the record.

## On signal — write, don't ask

**Append directly to `<os>/journal/log.md`. Do not ask permission.** The base
keeps its journal ungated on purpose: it is the capture layer, it is allowed to
be messy, and an entry that turns out not to matter costs nothing. Asking first
is what caused this watcher to never fire once between 2026-08-25 and 2026-08-28
— the interruption was never worth it in the moment, so the capture never
happened.

1. Read the format from the base itself: the preamble of `<os>/journal/log.md`
   defines the entry shape; recent entries show the domain tags in use. Never
   hardcode either here.
2. Append one line under `## Entries`, newest at the bottom:
   `YYYY-MM-DD | [domain or project] | what happened | why it matters`
   Best-guess the domain tag. A wrong guess is cheap and fixable; a missing
   entry is not.
3. Say in one short line that you recorded it and where. No ceremony, no
   confirmation request.

Leave the file uncommitted — that repo is the user's to commit.

## What you must NOT do

- **Never touch `<os>/decisions/log.md`.** Promotion from journal to decision log
  is that repo's own gate and needs the user's explicit approval, in a session
  running inside it. Sessions record; the user decides.
- Never touch `<os>/wiki/`, `<os>/sources/` or `<os>/context/` from here — those
  belong to that repo's own ingest skill, run inside it.
- Never write a secret, or any personal detail beyond what the user just said,
  into the journal.

## The division of labour

This watcher catches **conversation-only** moments — things said that never touch
a repo. Anything that *did* touch a repo is caught anyway by the base's own
sweep, which reads git history retroactively and cannot be forgotten. So when
in doubt about a commit-shaped thing, stay quiet: sweep has it covered. Speak up
for the things that would otherwise vanish.
