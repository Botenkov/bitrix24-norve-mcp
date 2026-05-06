import express from "express";
import crypto from "crypto";

const WEBHOOK = process.env.BITRIX_WEBHOOK ||
  "https://b24-5dx2y0.bitrix24.eu/rest/1/4cjga9783436rxem/";
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `https://bitrix24-norve-mcp-production.up.railway.app`;

// ─── BITRIX HELPER ─────────────────────────────────────────────────────────
async function bx(method, params = {}) {
  const res = await fetch(`${WEBHOOK}${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error_description || json.error);
  return json.result;
}

// ─── TOOLS ─────────────────────────────────────────────────────────────────
const TOOLS = [
  { name: "norve_validate", description: "Validate connection to Bitrix24 NORVE", inputSchema: { type: "object", properties: {} } },
  { name: "norve_task_create", description: "Create a task in Bitrix24 NORVE", inputSchema: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, responsibleId: { type: "number" }, deadline: { type: "string" }, priority: { type: "string", enum: ["0","1","2"] } } } },
  { name: "norve_task_list", description: "List tasks in Bitrix24 NORVE", inputSchema: { type: "object", properties: { limit: { type: "number" }, responsibleId: { type: "number" } } } },
  { name: "norve_task_update", description: "Update a task in Bitrix24 NORVE", inputSchema: { type: "object", required: ["taskId"], properties: { taskId: { type: "number" }, title: { type: "string" }, status: { type: "string" }, deadline: { type: "string" } } } },
  { name: "norve_deal_create", description: "Create a deal in Bitrix24 NORVE CRM", inputSchema: { type: "object", required: ["title"], properties: { title: { type: "string" }, stageId: { type: "string" }, amount: { type: "string" }, currency: { type: "string" }, contactId: { type: "number" } } } },
  { name: "norve_deal_list", description: "List deals in Bitrix24 NORVE CRM", inputSchema: { type: "object", properties: { limit: { type: "number" }, stageId: { type: "string" } } } },
  { name: "norve_deal_update", description: "Update a deal in Bitrix24 NORVE CRM", inputSchema: { type: "object", required: ["dealId"], properties: { dealId: { type: "number" }, stageId: { type: "string" }, amount: { type: "string" }, title: { type: "string" } } } },
  { name: "norve_lead_create", description: "Create a lead in Bitrix24 NORVE CRM", inputSchema: { type: "object", required: ["title"], properties: { title: { type: "string" }, name: { type: "string" }, lastName: { type: "string" }, phone: { type: "string" }, email: { type: "string" } } } },
  { name: "norve_lead_list", description: "List leads in Bitrix24 NORVE CRM", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "norve_contact_create", description: "Create a contact in Bitrix24 NORVE CRM", inputSchema: { type: "object", required: ["name","lastName"], properties: { name: { type: "string" }, lastName: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, position: { type: "string" } } } },
  { name: "norve_users_list", description: "List all users in Bitrix24 NORVE", inputSchema: { type: "object", properties: {} } },
  { name: "norve_deal_stages", description: "Get deal pipeline stages in Bitrix24 NORVE", inputSchema: { type: "object", properties: { categoryId: { type: "number" } } } },
  { name: "norve_pipelines_list", description: "List all deal pipelines in Bitrix24 NORVE", inputSchema: { type: "object", properties: {} } },
];

async function executeTool(name, args = {}) {
  switch (name) {
    case "norve_validate": return await bx("app.info", {});
    case "norve_task_create": {
      const fields = { TITLE: args.title, RESPONSIBLE_ID: args.responsibleId || 1, PRIORITY: args.priority || "1" };
      if (args.description) fields.DESCRIPTION = args.description;
      if (args.deadline) fields.DEADLINE = args.deadline;
      return await bx("tasks.task.add", { fields });
    }
    case "norve_task_list": {
      const filter = args.responsibleId ? { RESPONSIBLE_ID: args.responsibleId } : {};
      return await bx("tasks.task.list", { filter, select: ["ID","TITLE","STATUS","RESPONSIBLE_ID","DEADLINE","CREATED_DATE"], limit: args.limit || 20 });
    }
    case "norve_task_update": {
      const fields = {};
      if (args.title) fields.TITLE = args.title;
      if (args.status) fields.STATUS = args.status;
      if (args.deadline) fields.DEADLINE = args.deadline;
      return await bx("tasks.task.update", { taskId: args.taskId, fields });
    }
    case "norve_deal_create": {
      const fields = { TITLE: args.title, CURRENCY_ID: args.currency || "EUR" };
      if (args.stageId) fields.STAGE_ID = args.stageId;
      if (args.amount) fields.OPPORTUNITY = args.amount;
      if (args.contactId) fields.CONTACT_ID = args.contactId;
      return await bx("crm.deal.add", { fields });
    }
    case "norve_deal_list": {
      const filter = args.stageId ? { STAGE_ID: args.stageId } : {};
      return await bx("crm.deal.list", { filter, select: ["ID","TITLE","STAGE_ID","OPPORTUNITY","CURRENCY_ID","DATE_CREATE"], order: { DATE_CREATE: "DESC" }, start: 0 });
    }
    case "norve_deal_update": {
      const fields = {};
      if (args.stageId) fields.STAGE_ID = args.stageId;
      if (args.amount) fields.OPPORTUNITY = args.amount;
      if (args.title) fields.TITLE = args.title;
      return await bx("crm.deal.update", { id: args.dealId, fields });
    }
    case "norve_lead_create": {
      const fields = { TITLE: args.title };
      if (args.name) fields.NAME = args.name;
      if (args.lastName) fields.LAST_NAME = args.lastName;
      if (args.phone) fields.PHONE = [{ VALUE: args.phone, VALUE_TYPE: "WORK" }];
      if (args.email) fields.EMAIL = [{ VALUE: args.email, VALUE_TYPE: "WORK" }];
      return await bx("crm.lead.add", { fields });
    }
    case "norve_lead_list":
      return await bx("crm.lead.list", { select: ["ID","TITLE","NAME","LAST_NAME","STATUS_ID","DATE_CREATE"], order: { DATE_CREATE: "DESC" }, start: 0 });
    case "norve_contact_create": {
      const fields = { NAME: args.name, LAST_NAME: args.lastName };
      if (args.phone) fields.PHONE = [{ VALUE: args.phone, VALUE_TYPE: "WORK" }];
      if (args.email) fields.EMAIL = [{ VALUE: args.email, VALUE_TYPE: "WORK" }];
      if (args.position) fields.POST = args.position;
      return await bx("crm.contact.add", { fields });
    }
    case "norve_users_list": return await bx("user.get", { filter: { ACTIVE: true } });
    case "norve_deal_stages": return await bx("crm.dealcategory.stage.list", { id: args.categoryId || 0 });
    case "norve_pipelines_list": return await bx("crm.dealcategory.list", {});
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP HANDLER ───────────────────────────────────────────────────────────
async function handleMCP(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "bitrix24-norve", version: "1.0.0" } } };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    try {
      const result = await executeTool(name, args || {});
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } };
    } catch (err) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true } };
    }
  }
  if (method === "notifications/initialized" || method === "ping") return null;
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ─── EXPRESS ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── OAUTH 2.1 ─────────────────────────────────────────────────────────────
const tokens = new Set();

// OAuth metadata discovery
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  });
});

// Authorization endpoint — auto-approve, redirect back immediately
app.get("/authorize", (req, res) => {
  const { redirect_uri, state, code_challenge, code_challenge_method } = req.query;
  const code = crypto.randomBytes(16).toString("hex");
  // Store code with challenge for later verification
  tokens.set(`code:${code}`, { redirect_uri, code_challenge, code_challenge_method, createdAt: Date.now() });
  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
});

// Token endpoint
app.post("/token", (req, res) => {
  const { grant_type, code, redirect_uri } = req.body;
  if (grant_type === "authorization_code") {
    const stored = tokens.get(`code:${code}`);
    if (!stored) return res.status(400).json({ error: "invalid_grant" });
    tokens.delete(`code:${code}`);
    const access_token = crypto.randomBytes(32).toString("hex");
    tokens.add(access_token);
    return res.json({ access_token, token_type: "Bearer", expires_in: 86400 });
  }
  res.status(400).json({ error: "unsupported_grant_type" });
});

// ─── SSE + MESSAGES ────────────────────────────────────────────────────────
const sessions = new Map();

app.get("/sse", (req, res) => {
  const sessionId = crypto.randomUUID();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sessions.set(sessionId, res);
  res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: `/messages?sessionId=${sessionId}` })}\n\n`);
  const ka = setInterval(() => res.write(": keepalive\n\n"), 15000);
  req.on("close", () => { clearInterval(ka); sessions.delete(sessionId); });
});

app.post("/messages", async (req, res) => {
  const { sessionId } = req.query;
  const sseRes = sessions.get(sessionId);
  const response = await handleMCP(req.body);
  if (sseRes && response) {
    sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
  }
  res.status(200).json({ ok: true });
});

// Health
app.get("/", (_, res) => res.json({ status: "ok", server: "bitrix24-norve-mcp" }));
app.get("/health", (_, res) => res.json({ status: "ok", server: "bitrix24-norve-mcp" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Bitrix24 NORVE MCP Server running on port ${PORT}`);
});
