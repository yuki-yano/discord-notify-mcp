# discord-notify-mcp

`discord-notify-mcp` is an MCP (Model Context Protocol) server that exposes a Discord notification tool over standard I/O. Run it with `bunx`, point your MCP-compatible client at the process, and trigger webhook messages straight from your automations or workflows.

## Features

- **Discord notification tool** – Publishes a `notify` MCP tool that sends messages to the Discord webhook configured via `DISCORD_WEBHOOK_URL`.
- **User mention support** – When `DISCORD_USER_ID` is set, the tool prefixes the message with a mention so the specified user receives a notification.
- **Automatic chunking** – Splits payloads longer than 2000 characters into sequential messages to respect Discord’s content limit.

## Requirements

- Bun v1.2 or newer
- `DISCORD_WEBHOOK_URL` environment variable containing a valid Discord webhook URL
- (Optional) `DISCORD_USER_ID` for automatic user mentions
- (Optional) `DISCORD_NOTIFY_USER_NAME` to override the username displayed in Discord

## Installation

```bash
bun install
```

Configure the required environment variables via your shell, `.env`, or a process manager:

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/<id>/<token>"
# Optional
export DISCORD_USER_ID="<discord-user-id>"
# Optional
export DISCORD_NOTIFY_USER_NAME="notify-bot"
```

## Running the server

During development:

```bash
bun run dev
```

### Claude Code configuration

```bash
claude mcp add \
  --env DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/<id>/<token>" \
  --env DISCORD_USER_ID="<discord-user-id>" \
  --env DISCORD_NOTIFY_USER_NAME="notify-bot" \
  notify -- bunx discord-notify-mcp@latest
```

### Codex CLI configuration

```toml
[mcp_servers.notify]
command = "bunx"
args = ["discord-notify-mcp@latest"]

[mcp_servers.notify.env]
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/<id>/<token>"
DISCORD_USER_ID = "discord-user-id"
DISCORD_NOTIFY_USER_NAME = "notify-bot"
```

The process stays attached to STDIN/STDOUT, waiting for MCP traffic. Once your client sends `initialize`, the `notify` tool becomes available.

## Invoking the tool

Send a tool call from your MCP client similar to the payload below:

```jsonc
{
  "type": "tool",
  "toolName": "notify",
  "arguments": {
    "content": "Deployment complete ✅",
    "username": "Release Bot",
    "embeds": [
      {
        "title": "Version 1.2.0",
        "description": "Commit abc123 deployed successfully"
      }
    ]
  }
}
```

If `DISCORD_USER_ID` is configured, the first chunk automatically prefixes the content with `<@userId>` and sets the `allowed_mentions.users` field so Discord performs the mention.

## Project scripts

```bash
# Format files in-place with Biome
bun run format

# Verify formatting only
bun run format:check

# Type-check with TypeScript
bun run typecheck

# Lint with Biome rules
bun run lint

# Run all Vitest suites
bun run test

# CI aggregate: format:check → typecheck → lint → test
bun run ci
```

## Directory layout

```
src/
  config.ts              Environment validation and caching helpers
  discord.ts             Lightweight Discord webhook client
  notification-action.ts MCP notification tool implementation
  server.ts              MCP server bootstrap and tool registration
  main.ts                bunx entry point
tests/
  *.test.ts              Vitest suites covering config, client, action, server, and style rules
```

## Troubleshooting

- **Process fails at startup**  
  Double-check that `DISCORD_WEBHOOK_URL` begins with `https://discord.com/api/webhooks/` and is free from stray whitespace.

- **Messages are not delivered**  
  The MCP tool propagates Discord HTTP errors back to the client. Inspect the error for rate limits or permission issues.

- **Style test fails**  
  `tests/conventions.test.ts` ensures `class` and `function` declarations are absent. Stick with arrow functions when adding new code.

## License

MIT License. See [`LICENSE`](./LICENSE) for details.
