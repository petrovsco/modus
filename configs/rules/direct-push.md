# Rule: Direct-to-main push + auto-checkpoint

**Type:** CLAUDE.md snippet / working convention.
**Scope:** solo repos or repos where the owner has opted into trunk-based flow.
**Why:** the owner treats each finished, build-passing unit as a checkpoint and does
not want to be asked to commit/push every time.

> ⚠️ Opt-in per project. Do **not** assume this for repos with PR review, protected
> branches, or multiple contributors. Confirm before enabling.

---

## Commit & push convention

- Push straight to the main branch (no feature-branch/PR ceremony) unless the repo
  says otherwise.
- When you judge an assignment finished **and the build passes**, commit and push
  automatically — don't wait to be asked.
- Always run the project's build (not just a typecheck) before committing — see the
  `build-before-push` rule.
- Treat each commit as a checkpoint: after it, review the session for anything
  worth saving to memory.
