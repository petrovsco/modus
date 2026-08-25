---
name: visual-iteration
description: Iterate on visuals with screenshots — use when tuning SVG, charts,
  custom components, or any standalone HTML where seeing the rendered result
  between changes matters. Covers the serve-over-HTTP + element-screenshot loop
  with the Playwright browser.
---

# Iterating on a visual

The Playwright MCP server (bundled with this plugin) drives a real browser —
use it to *look at* what you are tuning instead of guessing from code.

- Playwright blocks `file://` URLs. To preview a standalone HTML/SVG file,
  serve it over HTTP first (e.g. `npx http-server <scratch-dir> -p <port>`),
  then navigate the Playwright browser to `http://localhost:<port>/…`.
- Take **element screenshots** (scope the screenshot to the specific node)
  rather than full-page shots when tuning one component — faster to compare
  iterations.
- Do scratch work in a temp/scratchpad directory, not the repo root.
- Screenshots land in the Playwright output directory; if the project wants
  them somewhere specific, add `--output-dir <path>` to the server args in a
  project-level `.mcp.json` (which overrides this plugin's default).
- **Clean up** stray PNGs / scratch HTML from the repo when done.
