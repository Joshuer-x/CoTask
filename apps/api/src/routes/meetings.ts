import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb, meetings, actionPoints, tasks } from "@cotask/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../plugins/auth.js";
import { config } from "../config.js";

const createMeetingSchema = z.object({
  title: z.string().min(1),
  platform: z.enum(["zoom", "google_meet", "teams"]),
  botJoinUrl: z.string().url(),
  externalMeetingId: z.string().min(1),
});

const updateActionPointSchema = z.object({
  normalizedText: z.string().optional(),
  inferredAssigneeId: z.string().uuid().nullable().optional(),
  dueDateHint: z.string().optional(),
});

export const meetingRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb(config.databaseUrl);

  // POST /v1/workspaces/:wid/meetings — Register meeting + trigger bot join
  app.post("/:wid/meetings", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const body = createMeetingSchema.parse(req.body);
    const [meeting] = await db
      .insert(meetings)
      .values({ ...body, workspaceId: wid, createdBy: req.user.sub, status: "scheduled" })
      .returning();

    // Trigger bot join via bot-orchestrator (fire-and-forget)
    fetch(`${config.aiServiceUrl}/internal/bot/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-secret": config.aiServiceSecret },
      body: JSON.stringify({ meetingId: meeting!.id, joinUrl: body.botJoinUrl, platform: body.platform }),
    }).catch((err) => app.log.error({ err }, "Bot join trigger failed"));

    return reply.status(201).send({ data: meeting });
  });

  // GET /v1/workspaces/:wid/meetings
  app.get("/:wid/meetings", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const result = await db
      .select()
      .from(meetings)
      .where(eq(meetings.workspaceId, wid))
      .orderBy(desc(meetings.createdAt))
      .limit(50);
    return reply.send({ data: result, meta: { nextCursor: null } });
  });

  // GET /v1/workspaces/:wid/meetings/:mid
  app.get("/:wid/meetings/:mid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, mid } = req.params as { wid: string; mid: string };
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, mid), eq(meetings.workspaceId, wid)))
      .limit(1);
    if (!meeting) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Meeting not found" } });
    const points = await db
      .select()
      .from(actionPoints)
      .where(eq(actionPoints.meetingId, mid))
      .orderBy(actionPoints.id);
    return reply.send({ data: { ...meeting, actionPoints: points } });
  });

  // POST /v1/workspaces/:wid/meetings/:mid/action-points/:aid/accept
  app.post("/:wid/meetings/:mid/action-points/:aid/accept", { preHandler: [authenticate] }, async (req, reply) => {
    const { mid, aid } = req.params as { wid: string; mid: string; aid: string };
    const [point] = await db.select().from(actionPoints).where(eq(actionPoints.id, aid)).limit(1);
    if (!point) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Action point not found" } });

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: req.user.wid,
        title: point.normalizedText,
        assigneeId: point.inferredAssigneeId,
        dueDate: point.dueDateHint,
        source: "ai_meeting",
        meetingId: mid,
        creatorId: req.user.sub,
      })
      .returning();

    await db
      .update(actionPoints)
      .set({ accepted: true, acceptedBy: req.user.sub, acceptedAt: new Date(), taskId: task!.id })
      .where(eq(actionPoints.id, aid));

    return reply.send({ data: task });
  });

  // POST /v1/workspaces/:wid/meetings/:mid/action-points/:aid/reject
  app.post("/:wid/meetings/:mid/action-points/:aid/reject", { preHandler: [authenticate] }, async (req, reply) => {
    const { aid } = req.params as { wid: string; mid: string; aid: string };
    await db
      .update(actionPoints)
      .set({ accepted: false, acceptedBy: req.user.sub, acceptedAt: new Date() })
      .where(eq(actionPoints.id, aid));
    return reply.send({ data: { ok: true } });
  });

  // PATCH /v1/workspaces/:wid/meetings/:mid/action-points/:aid
  app.patch("/:wid/meetings/:mid/action-points/:aid", { preHandler: [authenticate] }, async (req, reply) => {
    const { aid } = req.params as { wid: string; mid: string; aid: string };
    const body = updateActionPointSchema.parse(req.body);
    const [updated] = await db
      .update(actionPoints)
      .set(body)
      .where(eq(actionPoints.id, aid))
      .returning();
    return reply.send({ data: updated });
  });

  // POST /v1/workspaces/:wid/meetings/:mid/action-points/accept-all
  app.post("/:wid/meetings/:mid/action-points/accept-all", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, mid } = req.params as { wid: string; mid: string };
    const points = await db
      .select()
      .from(actionPoints)
      .where(and(eq(actionPoints.meetingId, mid), eq(actionPoints.accepted, null as unknown as boolean)));

    const createdTasks = await Promise.all(
      points
        .filter((p) => p.confidence >= 0.6) // only Medium/High confidence in accept-all
        .map(async (point) => {
          const [task] = await db
            .insert(tasks)
            .values({
              workspaceId: wid,
              title: point.normalizedText,
              assigneeId: point.inferredAssigneeId,
              dueDate: point.dueDateHint,
              source: "ai_meeting",
              meetingId: mid,
              creatorId: req.user.sub,
            })
            .returning();
          await db
            .update(actionPoints)
            .set({ accepted: true, acceptedBy: req.user.sub, acceptedAt: new Date(), taskId: task!.id })
            .where(eq(actionPoints.id, point.id));
          return task;
        }),
    );

    return reply.send({ data: createdTasks });
  });
};
