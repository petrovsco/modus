# Rule: Build (not just typecheck) before pushing

**Type:** CLAUDE.md snippet / working convention.
**Scope:** any project with a compile/build step that CI or the host runs on deploy.
**Why:** a typecheck-only pass (`tsc --noEmit`) misses errors the real build catches
(the build is what the deploy platform actually runs). Pushing a green typecheck but
red build breaks the deployment.

---

## Before committing/pushing

- Run the project's **full build** (e.g. `npm run build` → `tsc -b` + bundler), not
  just `npm run typecheck`. The build is the source of truth for "does this ship."
- Only commit/push once the build passes.
- Adapt the command to the stack (e.g. `cargo build`, `go build ./...`,
  `mvn package`) — the principle is "run the same thing the deploy runs."
