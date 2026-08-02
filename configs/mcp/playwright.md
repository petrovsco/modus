# MCP server: Playwright

Browser automation + screenshots. Used by the `visual-iteration` workflow.

Add to the project's `.mcp.json` under `mcpServers`. Point `--output-dir` at a
folder inside *this* project (create it if needed):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@0.0.78",
        "--output-dir",
        "<ABSOLUTE_PATH_TO>/playwright-tests"
      ]
    }
  }
}
```

- Pin the version, don't use `@latest`: it re-resolves on every server start, so a
  compromised or simply broken release lands without anyone choosing it. Get the
  current one with `npm view @playwright/mcp version` and bump deliberately.
- No secrets required.
- `--output-dir` is where screenshots/artifacts land — keep it out of the app's
  source tree (and gitignore it if you don't want the shots committed).
