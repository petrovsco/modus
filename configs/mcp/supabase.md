# MCP server: Supabase

Query/inspect a Supabase project (tables, migrations, logs, advisors) from the agent.

> 🔐 **Secret.** This server takes a personal access token (`sbp_...`). **Never**
> commit the real token. Keep `.mcp.json` gitignored, or inject the token from an
> environment variable / secret store. The template below uses a placeholder.

Add to the project's `.mcp.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "REPLACE_WITH_SBP_ACCESS_TOKEN"
      ]
    }
  }
}
```

- Generate a token at Supabase → Account → Access Tokens.
- Consider `--read-only` and/or `--project-ref <ref>` to scope what the server can
  touch.
- When wiring a client app, prefer the MCP tools `get_project_url` /
  `get_publishable_keys` over hardcoding.
