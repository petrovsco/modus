# Rule: Visual iteration workflow (Playwright MCP)

**Type:** CLAUDE.md snippet / working convention.
**Scope:** projects where you iterate on visuals — SVG, charts, anatomical maps,
component layouts — and want to *see* the result while tuning it.
**Depends on:** the `mcp-playwright` MCP server.

---

## Iterating on a visual

- Playwright MCP blocks `file://` URLs. To preview a standalone HTML/SVG file, serve
  it over HTTP first (e.g. `npx http-server <scratchpad-dir>`), then navigate the
  Playwright browser to `http://localhost:<port>/...`.
- Take **element screenshots** (scope the screenshot to the specific node) rather
  than full-page shots when tuning one component — it's faster to compare iterations.
- Do this scratch work in a temp/scratchpad directory, not the repo root.
- **Clean up** any stray PNGs / scratch HTML from the repo root when done.
