import express from "express";
import crypto from "crypto";

const WEBHOOK = process.env.BITRIX_WEBHOOK ||
  "https://b24-5dx2y0.bitrix24.eu/rest/1/4cjga9783436rxem/";
const PORT = process.env.PORT || 3000;

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

// ─── TOOLS DEFINITION ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "norve_validate",
    description: "Validate connection to Bitrix24 NORVE",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "norve_task_create",
    description: "Create a task in Bitrix24 NORVE",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        responsibleId: { type: "number", default: 1 },
        deadline: { type: "string" },
        priority: { type: "string", enum: ["0", "1", "2"], default: "1" },
      },
    },
  },
  {
    name: "norve_task_list",
    description: "List tasks in Bitrix24 NORVE",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
        responsibleId: { type: "number" },
      },
    },
  },
  {
    name: "norve_task_update",
    description: "Update a task in Bitrix24 NORVE",
    inputSchema: {
      type: "object",
      required: ["taskId"],
      properties: {
        taskId: { type: "number" },
        title: { type: "string" },
        status: { type: "string", enum: ["1","2","3","4","5"] },
        deadline: { type: "string" },
      },
    },
  },
  {
    name: "norve_deal_create",
    description: "Create a deal in Bitrix24 NORVE CRM",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        stageId: { type: "string" },
        amount: { type: "string" },
        currency: { type: "string", default: "EUR" },
        contactId: { type: "number" },
      },
    },
  },
  {
    name: "norve_deal_list",
    description: "List deals in Bitrix24 NORVE CRM",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 20 }, stageId: { type: "string" } },
    },
  },
  {
    name: "norve_deal_update",
    description: "Update a deal in Bitrix24 NORVE CRM",
    inputSchema: {
      type: "object",
      required: ["dealId"],
      properties: {
        dealId: { type: "number" },
        stageId: { type: "string" },
        amount: { type: "string" },
        title: { type: "string" },
      },
    },
  },
  {
    name: "norve_lead_create",
    description: "Create a lead in Bitrix24 NORVE CRM",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        name: { type: "string" },
        lastName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
    },
  },
  {
    name: "norve_lead_list",
    description: "List leads in Bitrix24 NORVE CRM",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 20 } } },
  },
  {
    name: "norve_contact_create",
    description: "Create a contact in Bitrix24 NORVE CRM",
    inputSchema: {
      type: "object",
      required: ["name", "lastName"],
      properties: {
        name: { type: "string" },
        lastName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        position: { type: "string" },
      },
    },
  },
  {
    name: "norve_users_list",
    description: "List all users in Bitrix24 NORVE",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "norve_deal_stages",
    description: "Get deal pipeline stages in Bitrix24 NORVE",
    inputSchema: {
      type: "object",
      properties: { categoryId: { type: "number", default: 0 } },
    },
  },
  {
    name: "norve_pipelines_list",
    description: "List all deal pipelines in Bitrix24 NORVE",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── TOOL EXECUTOR ─────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case "norve_validate":
      return await bx("app.info", {});

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

    case "norve_users_list":
      return await bx("user.get", { filter: { ACTIVE: true } });

    case "norve_deal_stages":
      return await bx("crm.dealcategory.stage.list", { id: args.categoryId || 0 });

    case "norve_pipelines_list":
      return await bx("crm.dealcategory.list", {});

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP JSON-RPC HANDLER ──────────────────────────────────────────────────
async function handleMCP(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: {} },
        serverInfo: { name: "bitrix24-norve", version: "1.0.0" },
      },
    };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    try {
      const result = await executeTool(name, args || {});
      return {
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      };
    } catch (err) {
      return {
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true },
      };
    }
  }

  if (method === "notifications/initialized") {
    return null;
  }

  return {
    jsonrpc: "2.0", id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// ─── EXPRESS APP ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

const sessions = new Map();

// SSE endpoint
app.get("/sse", (req, res) => {
  const sessionId = crypto.randomUUID();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  sessions.set(sessionId, res);

  // Send endpoint event
  res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: `/messages?sessionId=${sessionId}` })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sessions.delete(sessionId);
  });
});

// Messages endpoint
app.post("/messages", async (req, res) => {
  const { sessionId } = req.query;
  const sseRes = sessions.get(sessionId);

  const response = await handleMCP(req.body);

  if (sseRes && response) {
    sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
  }

  res.status(200).json({ ok: true });
});

// Health check
app.get("/", (_, res) => res.json({ status: "ok", server: "bitrix24-norve-mcp" }));

app.get("/health", (_, res) => res.json({ status: "ok", server: "bitrix24-norve-mcp" }));

app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Bitrix24 NORVE MCP Server running on port ${PORT}`);
  console.log(`   SSE: http://0.0.0.0:${PORT}/sse`);
});
