#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import * as z from 'zod/v4';

const BASE_URL = (process.env.MCP_TOASTIT_BASE_URL || 'https://api.toastit.cc').replace(/\/$/, '');
const PAT = (process.env.MCP_TOASTIT_PAT || '').trim();
const API_ACCEPT = process.env.MCP_TOASTIT_ACCEPT || 'application/vnd.toastit.public+json; version=1';
const TIMEOUT_MS = Number.parseInt(process.env.MCP_TOASTIT_TIMEOUT_MS || '10000', 10);
const TRANSPORT = (process.env.MCP_TRANSPORT || 'stdio').trim().toLowerCase();
const HTTP_HOST = process.env.MCP_HTTP_HOST || '0.0.0.0';
const HTTP_PORT = Number.parseInt(process.env.MCP_HTTP_PORT || '3001', 10);

const requiredEnvError = () => {
  if (!PAT) {
    throw new Error('Missing MCP_TOASTIT_PAT environment variable.');
  }
};

const parseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text.length > 0 ? { raw: text } : null;
};

const buildUrl = (path, query = undefined) => {
  const url = new URL(`${BASE_URL}${path}`);

  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const toastitRequest = async ({ method, path, query, body }) => {
  requiredEnvError();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: API_ACCEPT,
        Authorization: `Bearer ${PAT}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const parsed = await parseBody(response);

    if (!response.ok) {
      const message = parsed && typeof parsed === 'object'
        ? JSON.stringify(parsed)
        : `HTTP ${response.status}`;
      throw new Error(`Toastit API error (${response.status}): ${message}`);
    }

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
};

const toResult = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: data
});

const buildServer = () => {
  const server = new McpServer({
    name: 'toastit-public-api',
    version: '0.3.0'
  });

  server.registerTool(
    'list_workspaces',
    {
      description: 'List workspaces accessible by the authenticated user.',
      inputSchema: {}
    },
    async () => toResult(await toastitRequest({ method: 'GET', path: '/workspaces' }))
  );

  server.registerTool(
    'create_workspace',
    {
      description: 'Create a workspace accessible to the authenticated user.',
      inputSchema: {
        name: z.string().min(1)
      }
    },
    async ({ name }) => toResult(await toastitRequest({
      method: 'POST',
      path: '/workspaces',
      body: { name }
    }))
  );

  server.registerTool(
    'update_workspace_name',
    {
      description: 'Update workspace name.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        name: z.string().min(1)
      }
    },
    async ({ workspace_id, name }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/workspaces/${workspace_id}/name`,
      body: { name }
    }))
  );

  server.registerTool(
    'delete_workspace',
    {
      description: 'Delete a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive()
      }
    },
    async ({ workspace_id }) => toResult(await toastitRequest({
      method: 'DELETE',
      path: `/workspaces/${workspace_id}`
    }))
  );

  server.registerTool(
    'list_workspace_members',
    {
      description: 'List members of a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive()
      }
    },
    async ({ workspace_id }) => toResult(await toastitRequest({
      method: 'GET',
      path: `/workspaces/${workspace_id}/members`
    }))
  );

  server.registerTool(
    'invite_workspace_member',
    {
      description: 'Invite a member to a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        email: z.string().email()
      }
    },
    async ({ workspace_id, email }) => toResult(await toastitRequest({
      method: 'POST',
      path: `/workspaces/${workspace_id}/members`,
      body: { email }
    }))
  );

  server.registerTool(
    'remove_workspace_member',
    {
      description: 'Remove a member from a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        member_id: z.number().int().positive()
      }
    },
    async ({ workspace_id, member_id }) => toResult(await toastitRequest({
      method: 'DELETE',
      path: `/workspaces/${workspace_id}/members/${member_id}`
    }))
  );

  server.registerTool(
    'list_workspace_notes',
    {
      description: 'List notes for a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive()
      }
    },
    async ({ workspace_id }) => toResult(await toastitRequest({
      method: 'GET',
      path: `/workspaces/${workspace_id}/notes`
    }))
  );

  server.registerTool(
    'list_workspace_toasts',
    {
      description: 'List toasts for a workspace with status filter and pagination.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        status: z.enum(['all', 'new', 'ready', 'treated', 'vetoed']).optional(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional()
      }
    },
    async ({ workspace_id, status, page, per_page }) => toResult(await toastitRequest({
      method: 'GET',
      path: `/workspaces/${workspace_id}/toasts`,
      query: {
        status,
        page,
        perPage: per_page
      }
    }))
  );

  server.registerTool(
    'create_note',
    {
      description: 'Create a note in a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        title: z.string().min(1),
        body: z.string().optional(),
        is_important: z.boolean().optional()
      }
    },
    async ({ workspace_id, title, body, is_important }) => toResult(await toastitRequest({
      method: 'POST',
      path: `/workspaces/${workspace_id}/notes`,
      body: {
        title,
        ...(body !== undefined ? { body } : {}),
        ...(is_important !== undefined ? { isImportant: is_important } : {})
      }
    }))
  );

  server.registerTool(
    'create_toast',
    {
      description: 'Create a toast in a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        title: z.string().min(1),
        description: z.string().optional(),
        assignee_email: z.string().email().optional(),
        due_on: z.string().optional()
      }
    },
    async ({ workspace_id, title, description, assignee_email, due_on }) => toResult(await toastitRequest({
      method: 'POST',
      path: `/workspaces/${workspace_id}/toasts`,
      body: {
        title,
        ...(description !== undefined ? { description } : {}),
        ...(assignee_email !== undefined ? { assigneeEmail: assignee_email } : {}),
        ...(due_on !== undefined ? { dueOn: due_on } : {})
      }
    }))
  );

  server.registerTool(
    'update_note',
    {
      description: 'Update an existing note in a workspace.',
      inputSchema: {
        workspace_id: z.number().int().positive(),
        note_id: z.number().int().positive(),
        title: z.string().min(1),
        body: z.string().optional(),
        is_important: z.boolean().optional()
      }
    },
    async ({ workspace_id, note_id, title, body, is_important }) => toResult(await toastitRequest({
      method: 'PUT',
      path: `/workspaces/${workspace_id}/notes/${note_id}`,
      body: {
        title,
        ...(body !== undefined ? { body } : {}),
        ...(is_important !== undefined ? { isImportant: is_important } : {})
      }
    }))
  );

  server.registerTool(
    'update_toast_assignee',
    {
      description: 'Update toast assignee. Use empty string to clear assignee.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        assignee_email: z.string()
      }
    },
    async ({ toast_id, assignee_email }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/assignee`,
      body: { assigneeEmail: assignee_email }
    }))
  );

  server.registerTool(
    'update_toast_description',
    {
      description: 'Update toast description. Send empty string to clear description.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        description: z.string()
      }
    },
    async ({ toast_id, description }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/description`,
      body: { description }
    }))
  );

  server.registerTool(
    'get_toast',
    {
      description: 'Get one toast by id.',
      inputSchema: {
        toast_id: z.number().int().positive()
      }
    },
    async ({ toast_id }) => toResult(await toastitRequest({
      method: 'GET',
      path: `/toasts/${toast_id}`
    }))
  );

  server.registerTool(
    'update_toast_title',
    {
      description: 'Update toast title.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        title: z.string().min(1)
      }
    },
    async ({ toast_id, title }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/title`,
      body: { title }
    }))
  );

  server.registerTool(
    'update_toast_status',
    {
      description: 'Update toast public status (new, treated, vetoed).',
      inputSchema: {
        toast_id: z.number().int().positive(),
        status: z.enum(['new', 'ready', 'treated', 'vetoed'])
      }
    },
    async ({ toast_id, status }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/status`,
      body: { status }
    }))
  );

  server.registerTool(
    'transfer_toast',
    {
      description: 'Transfer a toast to another workspace.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        workspace_id: z.number().int().positive()
      }
    },
    async ({ toast_id, workspace_id }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/workspace`,
      body: { workspaceId: workspace_id }
    }))
  );

  server.registerTool(
    'update_toast_due_date',
    {
      description: 'Update toast due date. Use empty string to clear due date.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        due_on: z.string()
      }
    },
    async ({ toast_id, due_on }) => toResult(await toastitRequest({
      method: 'PATCH',
      path: `/toasts/${toast_id}/due-date`,
      body: { dueOn: due_on }
    }))
  );

  server.registerTool(
    'list_toast_comments',
    {
      description: 'List comments for a toast with pagination.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional()
      }
    },
    async ({ toast_id, page, per_page }) => toResult(await toastitRequest({
      method: 'GET',
      path: `/toasts/${toast_id}/comments`,
      query: {
        page,
        perPage: per_page
      }
    }))
  );

  server.registerTool(
    'create_toast_comment',
    {
      description: 'Create a new comment on a toast.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        content: z.string().min(1)
      }
    },
    async ({ toast_id, content }) => toResult(await toastitRequest({
      method: 'POST',
      path: `/toasts/${toast_id}/comments`,
      body: { content }
    }))
  );

  server.registerTool(
    'set_toast_boost',
    {
      description: 'Set boost state on a toast.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        boosted: z.boolean()
      }
    },
    async ({ toast_id, boosted }) => toResult(await toastitRequest({
      method: 'PUT',
      path: `/toasts/${toast_id}/boost`,
      body: { boosted }
    }))
  );

  server.registerTool(
    'set_toast_vote',
    {
      description: 'Set vote state on a toast.',
      inputSchema: {
        toast_id: z.number().int().positive(),
        voted: z.boolean()
      }
    },
    async ({ toast_id, voted }) => toResult(await toastitRequest({
      method: 'PUT',
      path: `/toasts/${toast_id}/vote`,
      body: { voted }
    }))
  );

  return server;
};

const runStdio = async () => {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

const runHttp = async () => {
  const app = createMcpExpressApp({ host: HTTP_HOST });

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true, transport: 'http' });
  });

  app.post('/mcp', async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    res.on('close', async () => {
      await transport.close();
      await server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('toastit-mcp HTTP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.'
      },
      id: null
    });
  });

  app.delete('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.'
      },
      id: null
    });
  });

  await new Promise((resolve, reject) => {
    app.listen(HTTP_PORT, HTTP_HOST, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  console.error(`toastit-mcp server running over streamable HTTP on ${HTTP_HOST}:${HTTP_PORT}`);
};

const main = async () => {
  if (TRANSPORT === 'http') {
    await runHttp();
    return;
  }

  if (TRANSPORT !== 'stdio') {
    throw new Error(`Unsupported MCP_TRANSPORT value "${TRANSPORT}". Expected "stdio" or "http".`);
  }

  await runStdio();
};

main().catch((error) => {
  console.error('toastit-mcp fatal error:', error);
  process.exit(1);
});
