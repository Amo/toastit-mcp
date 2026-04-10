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
- `list_workspace_toasts`
- `create_toast`
- `update_toast_assignee`
- `update_toast_description`
- `update_toast_due_date`
- `list_toast_comments`
- `create_toast_comment`
- `set_toast_boost`
- `set_toast_vote`

These map to:
- `GET /workspaces`
- `GET /workspaces/{id}/toasts`
- `POST /workspaces/{id}/toasts`
- `PATCH /toasts/{id}/assignee`
- `PATCH /toasts/{id}/description`
- `PATCH /toasts/{id}/due-date`
- `GET /toasts/{id}/comments`
- `POST /toasts/{id}/comments`
- `PUT /toasts/{id}/boost`
- `PUT /toasts/{id}/vote`

## Requirements

- Node.js 18+
- Toastit PAT token (`tpat_...`)

## Setup

```bash
cd /Users/amaury/code/toastit-mcp
cp .env.example .env
npm install
```

Environment variables:

- `MCP_TOASTIT_BASE_URL` (default: `https://api.toastit.cc`)
- `MCP_TOASTIT_PAT` (required)
- `MCP_TOASTIT_ACCEPT` (default: `application/vnd.toastit.public+json; version=1`)
- `MCP_TOASTIT_TIMEOUT_MS` (default: `10000`)

## Run

```bash
MCP_TOASTIT_PAT='tpat_xxx' npm start
```

HTTP mode:

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3001 MCP_TOASTIT_PAT='tpat_xxx' npm run start:http
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

```json
{
  "mcpServers": {
    "toastit": {
      "command": "node",
      "args": ["/Users/amaury/code/toastit-mcp/src/index.mjs"],
      "env": {
        "MCP_TOASTIT_BASE_URL": "https://api.toastit.cc",
        "MCP_TOASTIT_PAT": "tpat_xxx",
        "MCP_TOASTIT_ACCEPT": "application/vnd.toastit.public+json; version=1"
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
  -e MCP_TOASTIT_PAT='tpat_xxx' \
  toastit-mcp:local
```

## Notes

- Pagination fields returned by Toastit (including `pagination.nextPageUrl`) are passed through as-is.
- API errors are surfaced as MCP tool errors with HTTP status and returned payload when available.
- Transport is selectable through `MCP_TRANSPORT=stdio|http`.
