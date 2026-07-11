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
        "@playwright/mcp@latest",
        "--output-dir",
        "<ABSOLUTE_PATH_TO>/playwright-tests"
      ]
    }
  }
}
```

- No secrets required.
- `--output-dir` is where screenshots/artifacts land — keep it out of the app's
  source tree (and gitignore it if you don't want the shots committed).
