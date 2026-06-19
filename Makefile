SHELL := /bin/sh

NPM ?= npm
MCP_HTTP_HOST ?= 0.0.0.0
MCP_HTTP_PORT ?= 3001
MCP_TOASTIT_ACCEPT ?= application/vnd.toastit.public+json; version=1
MCP_TOASTIT_TIMEOUT_MS ?= 10000

.PHONY: install dev prod dev-stdio prod-stdio

install:
	$(NPM) ci

dev:
	@[ -f .env.dev.local ] || (echo "Missing .env.dev.local"; exit 1)
	@set -a; . ./.env.dev.local; set +a; \
	MCP_TRANSPORT=http \
	MCP_HTTP_HOST=$(MCP_HTTP_HOST) \
	MCP_HTTP_PORT=$${MCP_HTTP_PORT:-$(MCP_HTTP_PORT)} \
	MCP_TOASTIT_BASE_URL=$${MCP_TOASTIT_BASE_URL:-http://api.toastit.test} \
	MCP_TOASTIT_ACCEPT="$${MCP_TOASTIT_ACCEPT:-$(MCP_TOASTIT_ACCEPT)}" \
	MCP_TOASTIT_TIMEOUT_MS=$${MCP_TOASTIT_TIMEOUT_MS:-$(MCP_TOASTIT_TIMEOUT_MS)} \
	MCP_TOASTIT_PAT="$$MCP_TOASTIT_PAT" \
	$(NPM) run start:http

prod:
	@[ -f .env.prod.local ] || (echo "Missing .env.prod.local"; exit 1)
	@set -a; . ./.env.prod.local; set +a; \
	MCP_TRANSPORT=http \
	MCP_HTTP_HOST=$(MCP_HTTP_HOST) \
	MCP_HTTP_PORT=$${MCP_HTTP_PORT:-$(MCP_HTTP_PORT)} \
	MCP_TOASTIT_BASE_URL=$${MCP_TOASTIT_BASE_URL:-https://api.toastit.cc} \
	MCP_TOASTIT_ACCEPT="$${MCP_TOASTIT_ACCEPT:-$(MCP_TOASTIT_ACCEPT)}" \
	MCP_TOASTIT_TIMEOUT_MS=$${MCP_TOASTIT_TIMEOUT_MS:-$(MCP_TOASTIT_TIMEOUT_MS)} \
	MCP_TOASTIT_PAT="$$MCP_TOASTIT_PAT" \
	$(NPM) run start:http

dev-stdio:
	@[ -f .env.dev.local ] || (echo "Missing .env.dev.local"; exit 1)
	@set -a; . ./.env.dev.local; set +a; \
	[ -n "$$MCP_TOASTIT_PAT" ] || (echo "Missing MCP_TOASTIT_PAT in .env.dev.local"; exit 1); \
	MCP_TRANSPORT=stdio \
	MCP_TOASTIT_BASE_URL=$${MCP_TOASTIT_BASE_URL:-http://api.toastit.test} \
	MCP_TOASTIT_ACCEPT="$${MCP_TOASTIT_ACCEPT:-$(MCP_TOASTIT_ACCEPT)}" \
	MCP_TOASTIT_TIMEOUT_MS=$${MCP_TOASTIT_TIMEOUT_MS:-$(MCP_TOASTIT_TIMEOUT_MS)} \
	MCP_TOASTIT_PAT="$$MCP_TOASTIT_PAT" \
	node src/index.mjs

prod-stdio:
	@[ -f .env.prod.local ] || (echo "Missing .env.prod.local"; exit 1)
	@set -a; . ./.env.prod.local; set +a; \
	[ -n "$$MCP_TOASTIT_PAT" ] || (echo "Missing MCP_TOASTIT_PAT in .env.prod.local"; exit 1); \
	MCP_TRANSPORT=stdio \
	MCP_TOASTIT_BASE_URL=$${MCP_TOASTIT_BASE_URL:-https://api.toastit.cc} \
	MCP_TOASTIT_ACCEPT="$${MCP_TOASTIT_ACCEPT:-$(MCP_TOASTIT_ACCEPT)}" \
	MCP_TOASTIT_TIMEOUT_MS=$${MCP_TOASTIT_TIMEOUT_MS:-$(MCP_TOASTIT_TIMEOUT_MS)} \
	MCP_TOASTIT_PAT="$$MCP_TOASTIT_PAT" \
	node src/index.mjs
