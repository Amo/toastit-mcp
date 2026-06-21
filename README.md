# toastit-mcp

MCP server exposing the full Toastit public API toolset.

## Transport choice

- `stdio`:
  - Best for local MCP clients (Codex desktop, Claude Desktop)
- `http` (Streamable HTTP):
  - Best for running as a shared service (for example in Docker)
  - Exposes `/mcp` and `/healthz`

## Exposed tools (full scope)

### Overview
- `get_dashboard`
- `list_my_actions`
- `get_workspace`

### Workspaces
- `list_workspaces`
- `create_workspace`
- `get_workspace`
- `update_workspace_name`
- `delete_workspace`
- `list_workspace_members`
- `invite_workspace_member`
- `promote_workspace_member`
- `demote_workspace_member`
- `remove_workspace_member`
- `start_meeting`
- `stop_meeting`

### Notes
- `list_workspace_notes`
- `create_note`
- `update_note`
- `delete_note`
- `transfer_note`

### Toasts
- `list_workspace_toasts`
- `create_toast`
- `get_toast`
- `copy_toast`
- `update_toast_title`
- `update_toast_status`
- `transfer_toast`
- `update_toast_assignee`
- `update_toast_description`
- `update_toast_due_date`
- `set_toast_boost`
- `set_toast_vote`

### Comments
- `list_toast_comments`
- `create_toast_comment`
- `update_toast_comment`
- `delete_toast_comment`

### Auth
- `create_personal_token`

## Requirements

- Node.js 18+
- Toastit personal access token (`toastit_<selector>_<secret>`) or OAuth access token (`tto_...`)

## Authentication

### OAuth (Grok.com and other MCP hosts)

Production HTTP mode supports OAuth bearer tokens issued by Toastit (`tto_...`).

1. Add `https://mcp.toastit.cc/mcp` as a custom MCP connector in Grok.
2. Grok discovers OAuth metadata from the MCP server and opens a Toastit sign-in (email + PIN + consent).
3. Grok stores the access token and sends it on each MCP request.

Environment variables for metadata (local example):

- `MCP_RESOURCE_URI=http://mcp.toastit.test:3001/mcp`
- `MCP_AUTHORIZATION_SERVER=http://toastit.test`
- `MCP_SCOPES_SUPPORTED=mcp:tools`

### Personal access tokens (manual / local)

- `stdio` mode: each user provides their PAT through `MCP_TOASTIT_PAT` in the MCP client config.
- `http` mode: each user can send `Authorization: Bearer toastit_<pat>` on every MCP request.
- `MCP_TOASTIT_PAT` remains supported as an optional HTTP fallback for local testing.
- Use `create_personal_token` to issue additional PATs from an authenticated MCP session.

## Setup

```bash
cd /Users/amaury/code/toastit-mcp
cp .env.example .env
npm install
```

Environment variables:

- `MCP_TOASTIT_BASE_URL` (default: `https://api.toastit.cc`)
- `MCP_TOASTIT_PAT` (required for `stdio`; optional HTTP fallback)
- `MCP_TOASTIT_ACCEPT` (default: `application/vnd.toastit.public+json; version=1`)
- `MCP_TOASTIT_TIMEOUT_MS` (default: `10000`)

## Run

```bash
MCP_TOASTIT_PAT='toastit_xxx_yyy' npm start
```

HTTP mode:

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3001 npm run start:http
```

Makefile shortcuts:

```bash
# configure local files first:
# - .env.dev.local
# - .env.prod.local

# dev instance: http://api.toastit.test
make dev

# prod instance: https://api.toastit.cc
make prod
```

## Example MCP client config

Stdio:

```json
{
  "mcpServers": {
    "toastit": {
      "command": "node",
      "args": ["/Users/amaury/code/toastit-mcp/src/index.mjs"],
      "env": {
        "MCP_TOASTIT_BASE_URL": "https://api.toastit.cc",
        "MCP_TOASTIT_PAT": "toastit_xxx_yyy",
        "MCP_TOASTIT_ACCEPT": "application/vnd.toastit.public+json; version=1"
      }
    }
  }
}
```

Streamable HTTP:

```json
{
  "mcpServers": {
    "toastit": {
      "url": "https://mcp.toastit.cc/mcp",
      "headers": {
        "Authorization": "Bearer toastit_xxx_yyy"
      }
    }
  }
}
```

## Docker

Build and run:

```bash
docker build -t toastit-mcp:local .
docker run --rm -p 3001:3001 \
  -e MCP_TRANSPORT=http \
  -e MCP_TOASTIT_BASE_URL=https://api.toastit.cc \
  toastit-mcp:local
```

Call the server with your own PAT:

```bash
curl -X POST http://localhost:3001/mcp \
  -H 'Authorization: Bearer toastit_xxx_yyy' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0.1.0"}}}'
```

## Notes

- Pagination fields returned by Toastit (including `pagination.nextPageUrl`) are passed through as-is.
- Toast status filters support `all|new|ready|toasted|discarded`. Legacy aliases `treated` and `vetoed` are accepted and mapped to the API values.
- `update_toast_status` supports `new`, `ready`, `toasted`, and `discarded` (legacy aliases `treated` and `vetoed` accepted).
- API errors are surfaced as MCP tool errors with HTTP status and returned payload when available.
- Transport is selectable through `MCP_TRANSPORT=stdio|http`.