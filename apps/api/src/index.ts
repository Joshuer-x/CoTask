import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import IORedis from "ioredis";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { taskRoutes } from "./routes/tasks.js";
import { meetingRoutes } from "./routes/meetings.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { notificationRoutes } from "./routes/notifications.js";
import { registerSocketGateway } from "./ws/gateway.js";
import { registerErrorHandler } from "./plugins/errorHandler.js";
import type { WsEvents } from "@cotask/types";
import { z } from "zod";
import { getDb, meetings } from "@cotask/db";
import { eq } from "drizzle-orm";

const app = Fastify({ logger: { level: config.env === "production" ? "info" : "debug" }, genReqId: () => crypto.randomUUID() });

await app.register(cors, {
  origin: process.env["WEB_URL"] ?? "http://localhost:3000",
  credentials: true,
});

await app.register(cookie, { secret: config.jwt.secret });

await app.register(jwt, {
  secret: config.jwt.secret,
  cookie: { cookieName: "refresh_token", signed: false },
});

const redisClient = new IORedis(config.redisUrl, { lazyConnect: true });
await app.register(rateLimit, {
  max: 600,
  timeWindow: "1 minute",
  redis: redisClient,
});

registerErrorHandler(app);

// ─── Routes ───────────────────────────────────────────────────────────────────

await app.register(authRoutes, { prefix: "/v1/auth" });
await app.register(workspaceRoutes, { prefix: "/v1/workspaces" });
await app.register(taskRoutes, { prefix: "/v1/workspaces" });
await app.register(meetingRoutes, { prefix: "/v1/workspaces" });
await app.register(notificationRoutes, { prefix: "/v1/workspaces" });

// ─── WebSocket ────────────────────────────────────────────────────────────────

const httpServer = createServer(app.server);
const io = new SocketServer(httpServer, {
  cors: { origin: process.env["WEB_URL"] ?? "http://localhost:3000", credentials: true },
});
const wsGateway = registerSocketGateway(io, config.redisUrl);

// ─── Internal endpoint for AI service to push WS events ──────────────────────

const internalEmitSchema = z.object({
  workspace_id: z.string().uuid(),
  meeting_id: z.string().uuid(),
  action_points: z.array(z.record(z.unknown())),
});

app.post("/internal/ws/emit", async (req, reply) => {
  const secret = req.headers["x-service-secret"];
  if (secret !== config.aiServiceSecret) {
    return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Forbidden" } });
  }
  const body = internalEmitSchema.parse(req.body);
  wsGateway.emitToWorkspace(body.workspace_id, "action_points:ready", {
    meetingId: body.meeting_id,
    actionPoints: body.action_points as WsEvents["action_points:ready"]["actionPoints"],
  });
  return reply.send({ ok: true });
});

// ─── Internal: bot-orchestrator updates meeting status ────────────────────────

app.post("/internal/meeting-status", async (req, reply) => {
  if (req.headers["x-service-secret"] !== config.aiServiceSecret) {
    return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Forbidden" } });
  }
  const { meetingId, status } = z
    .object({ meetingId: z.string().uuid(), status: z.string() })
    .parse(req.body);
  const db = getDb(config.databaseUrl);
  const [updated] = await db
    .update(meetings)
    .set({ status, ...(status === "active" ? { startedAt: new Date() } : {}), ...(["completed", "failed"].includes(status) ? { endedAt: new Date() } : {}) })
    .where(eq(meetings.id, meetingId))
    .returning();
  // Push meeting:status WS event to the workspace
  if (updated) {
    wsGateway.emitToWorkspace(updated.workspaceId, "meeting:status", {
      meetingId,
      status: status as WsEvents["meeting:status"]["status"],
    });
  }
  return reply.send({ ok: true });
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

// ─── Start ────────────────────────────────────────────────────────────────────

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`API running on port ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
