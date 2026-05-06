import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const WEBHOOK = process.env.BITRIX_WEBHOOK ||
  "https://b24-5dx2y0.bitrix24.eu/rest/1/4cjga9783436rxem/";

const PORT = process.env.PORT || 3000;

// ─── HELPERS ───────────────────────────────────────────────────────────────
async function bx(method, params = {}) {
  const url = `${WEBHOOK}${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Bitrix error: ${json.error_description || json.error}`);
  return json.result;
}

// ─── MCP SERVER ────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "bitrix24-norve",
  version: "1.0.0",
});

// ── TASKS ──────────────────────────────────────────────────────────────────

server.tool(
  "norve_task_create",
  "Create a task in Bitrix24 NORVE",
  {
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    responsibleId: z.number().optional().default(1).describe("Responsible user ID"),
    deadline: z.string().optional().describe("Deadline in ISO format (YYYY-MM-DD)"),
    priority: z.enum(["0", "1", "2"]).optional().default("1").describe("0=low, 1=normal, 2=high"),
  },
  async ({ title, description, responsibleId, deadline, priority }) => {
    const fields = { TITLE: title, RESPONSIBLE_ID: responsibleId, PRIORITY: priority };
    if (description) fields.DESCRIPTION = description;
    if (deadline) fields.DEADLINE = deadline;
    const result = await bx("tasks.task.add", { fields });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_task_list",
  "List tasks in Bitrix24 NORVE",
  {
    limit: z.number().optional().default(20),
    responsibleId: z.number().optional().describe("Filter by user ID"),
  },
  async ({ limit, responsibleId }) => {
    const filter = responsibleId ? { RESPONSIBLE_ID: responsibleId } : {};
    const result = await bx("tasks.task.list", { filter, select: ["ID", "TITLE", "STATUS", "RESPONSIBLE_ID", "DEADLINE", "CREATED_DATE"], limit });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_task_update",
  "Update a task in Bitrix24 NORVE",
  {
    taskId: z.number().describe("Task ID"),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["1", "2", "3", "4", "5"]).optional().describe("1=new, 2=pending, 3=inprogress, 4=supposedly done, 5=completed"),
    deadline: z.string().optional(),
  },
  async ({ taskId, ...fields }) => {
    const payload = {};
    if (fields.title) payload.TITLE = fields.title;
    if (fields.description) payload.DESCRIPTION = fields.description;
    if (fields.status) payload.STATUS = fields.status;
    if (fields.deadline) payload.DEADLINE = fields.deadline;
    const result = await bx("tasks.task.update", { taskId, fields: payload });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── CRM DEALS ──────────────────────────────────────────────────────────────

server.tool(
  "norve_deal_create",
  "Create a deal in Bitrix24 NORVE CRM",
  {
    title: z.string().describe("Deal title"),
    stageId: z.string().optional().describe("Stage ID"),
    amount: z.string().optional(),
    currency: z.string().optional().default("EUR"),
    contactId: z.number().optional(),
    comments: z.string().optional(),
  },
  async ({ title, stageId, amount, currency, contactId, comments }) => {
    const fields = { TITLE: title, CURRENCY_ID: currency };
    if (stageId) fields.STAGE_ID = stageId;
    if (amount) fields.OPPORTUNITY = amount;
    if (contactId) fields.CONTACT_ID = contactId;
    if (comments) fields.COMMENTS = comments;
    const result = await bx("crm.deal.add", { fields });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_deal_list",
  "List deals in Bitrix24 NORVE CRM",
  {
    limit: z.number().optional().default(20),
    stageId: z.string().optional(),
  },
  async ({ limit, stageId }) => {
    const filter = stageId ? { STAGE_ID: stageId } : {};
    const result = await bx("crm.deal.list", {
      filter,
      select: ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "CURRENCY_ID", "DATE_CREATE", "ASSIGNED_BY_ID"],
      order: { DATE_CREATE: "DESC" },
      start: 0,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_deal_update",
  "Update a deal in Bitrix24 NORVE CRM",
  {
    dealId: z.number().describe("Deal ID"),
    stageId: z.string().optional(),
    amount: z.string().optional(),
    title: z.string().optional(),
  },
  async ({ dealId, stageId, amount, title }) => {
    const fields = {};
    if (stageId) fields.STAGE_ID = stageId;
    if (amount) fields.OPPORTUNITY = amount;
    if (title) fields.TITLE = title;
    const result = await bx("crm.deal.update", { id: dealId, fields });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── CRM LEADS ──────────────────────────────────────────────────────────────

server.tool(
  "norve_lead_create",
  "Create a lead in Bitrix24 NORVE CRM",
  {
    title: z.string().describe("Lead title"),
    name: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    comments: z.string().optional(),
  },
  async ({ title, name, lastName, phone, email, comments }) => {
    const fields = { TITLE: title };
    if (name) fields.NAME = name;
    if (lastName) fields.LAST_NAME = lastName;
    if (phone) fields.PHONE = [{ VALUE: phone, VALUE_TYPE: "WORK" }];
    if (email) fields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }];
    if (comments) fields.COMMENTS = comments;
    const result = await bx("crm.lead.add", { fields });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_lead_list",
  "List leads in Bitrix24 NORVE CRM",
  { limit: z.number().optional().default(20) },
  async ({ limit }) => {
    const result = await bx("crm.lead.list", {
      select: ["ID", "TITLE", "NAME", "LAST_NAME", "STATUS_ID", "DATE_CREATE"],
      order: { DATE_CREATE: "DESC" },
      start: 0,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── CONTACTS ───────────────────────────────────────────────────────────────

server.tool(
  "norve_contact_create",
  "Create a contact in Bitrix24 NORVE CRM",
  {
    name: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    position: z.string().optional(),
    company: z.string().optional(),
  },
  async ({ name, lastName, phone, email, position, company }) => {
    const fields = { NAME: name, LAST_NAME: lastName };
    if (phone) fields.PHONE = [{ VALUE: phone, VALUE_TYPE: "WORK" }];
    if (email) fields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }];
    if (position) fields.POST = position;
    if (company) fields.COMPANY_TITLE = company;
    const result = await bx("crm.contact.add", { fields });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── USERS ──────────────────────────────────────────────────────────────────

server.tool(
  "norve_users_list",
  "List all users in Bitrix24 NORVE",
  {},
  async () => {
    const result = await bx("user.get", { filter: { ACTIVE: true } });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── CRM PIPELINE / STAGES ──────────────────────────────────────────────────

server.tool(
  "norve_deal_stages",
  "Get deal pipeline stages in Bitrix24 NORVE",
  { categoryId: z.number().optional().default(0).describe("Pipeline/category ID (0 = default)") },
  async ({ categoryId }) => {
    const result = await bx("crm.dealcategory.stage.list", { id: categoryId });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "norve_pipelines_list",
  "List all deal pipelines (categories) in Bitrix24 NORVE",
  {},
  async () => {
    const result = await bx("crm.dealcategory.list", {});
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── GENERAL ────────────────────────────────────────────────────────────────

server.tool(
  "norve_validate",
  "Validate connection to Bitrix24 NORVE",
  {},
  async () => {
    const result = await bx("app.info", {});
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ─── EXPRESS + SSE TRANSPORT ───────────────────────────────────────────────
const app = express();
const transports = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_, res) => res.json({ status: "ok", server: "bitrix24-norve-mcp" }));

app.listen(PORT, () => {
  console.log(`✅ Bitrix24 NORVE MCP Server running on port ${PORT}`);
  console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
});
