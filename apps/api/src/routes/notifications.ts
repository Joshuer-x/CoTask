import type { FastifyPluginAsync } from "fastify";
import { getDb, notifications } from "@cotask/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { authenticate } from "../plugins/auth.js";
import { config } from "../config.js";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb(config.databaseUrl);

  // GET /v1/workspaces/:wid/notifications
  app.get("/:wid/notifications", { preHandler: [authenticate] }, async (req, reply) => {
    const unreadOnly = (req.query as Record<string, string>)["unread"] === "true";
    const conditions = [eq(notifications.userId, req.user.sub)];
    if (unreadOnly) conditions.push(isNull(notifications.readAt));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return reply.send({ data: rows });
  });

  // PATCH /v1/workspaces/:wid/notifications/:nid/read
  app.patch("/:wid/notifications/:nid/read", { preHandler: [authenticate] }, async (req, reply) => {
    const { nid } = req.params as { wid: string; nid: string };
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, nid), eq(notifications.userId, req.user.sub)));
    return reply.send({ data: { ok: true } });
  });

  // PATCH /v1/workspaces/:wid/notifications/read-all
  app.patch("/:wid/notifications/read-all", { preHandler: [authenticate] }, async (req, reply) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, req.user.sub), isNull(notifications.readAt)));
    return reply.send({ data: { ok: true } });
  });
};
