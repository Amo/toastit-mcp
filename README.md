# toastit-mcp

MCP server exposing the full Toastit public API toolset.

## Transport choice

- `stdio`:
  - Best for local MCP clients (Codex desktop, Claude Desktop)
- `http` (Streamable HTTP):
  - Best for running as a shared service (for example in Docker)
  - Exposes `/mcp` and `/healthz`

## Exposed tools (full scope)

- `list_workspaces`
- `create_workspace`
- `update_workspace_name`
- `delete_workspace`
- `list_workspace_members`
- `invite_workspace_member`
- `remove_workspace_member`
- `list_workspace_notes`
- `list_workspace_toasts`
- `create_note`
- `create_toast`
- `update_note`
- `get_toast`
- `update_toast_title`
- `update_toast_status`
- `transfer_toast`
- `update_toast_assignee`
- `update_toast_description`
- `update_toast_due_date`
- `list_toast_comments`
- `create_toast_comment`
- `update_toast_comment`
- `set_toast_boost`
- `set_toast_vote`

These map to:
- `GET /workspaces`
- `POST /workspaces`
- `PATCH /workspaces/{id}/name`
- `DELETE /workspaces/{id}`
- `GET /workspaces/{id}/members`
- `POST /workspaces/{id}/members`
- `DELETE /workspaces/{id}/members/{memberId}`
- `GET /workspaces/{id}/notes`
- `GET /workspaces/{id}/toasts`
- `POST /workspaces/{id}/notes`
- `POST /workspaces/{id}/toasts`
- `PUT /workspaces/{id}/notes/{noteId}`
- `GET /toasts/{id}`
- `PATCH /toasts/{id}/title`
- `PATCH /toasts/{id}/status`
- `PATCH /toasts/{id}/workspace`
- `PATCH /toasts/{id}/assignee`
- `PATCH /toasts/{id}/description`
- `PATCH /toasts/{id}/due-date`
- `GET /toasts/{id}/comments`
- `POST /toasts/{id}/comments`
- `PATCH /toasts/{id}/comments/{commentId}`
- `PUT /toasts/{id}/boost`
- `PUT /toasts/{id}/vote`

## Requirements

- Node.js 18+
- Toastit personal access token (`toastit_<selector>_<secret>`)

## Authentication

- `stdio` mode: each user provides their PAT through `MCP_TOASTIT_PAT` in the MCP client config.
- `http` mode: each user provides their PAT on every MCP request with `Authorization: Bearer <pat>`.
- `MCP_TOASTIT_PAT` remains supported as an optional HTTP fallback for local testing, but shared production servers should rely on per-request bearer tokens.

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
