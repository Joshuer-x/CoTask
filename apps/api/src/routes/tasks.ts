import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb, tasks, taskComments, taskActivityLog, taskLinks, notifications, users } from "@cotask/db";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { authenticate } from "../plugins/auth.js";
import { config } from "../config.js";

const createTaskSchema = z.object({
  title: z.string().min(1).max(512),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  priority: z.number().int().min(1).max(4).default(3),
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).default("todo"),
});

const updateTaskSchema = createTaskSchema.partial();

const commentSchema = z.object({
  body: z.string().min(1),
  parentCommentId: z.string().uuid().optional(),
});

const linkSchema = z.object({
  targetTaskId: z.string().uuid(),
  linkType: z.enum(["blocks", "blocked_by", "duplicates", "relates_to"]),
});

const filterSchema = z.object({
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  sortBy: z.enum(["created_at", "due_date", "priority", "updated_at"]).default("created_at"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(200).default(200),
});

// Columns used in comments/activity select
const commentAuthorCols = {
  id: taskComments.id,
  taskId: taskComments.taskId,
  authorId: taskComments.authorId,
  body: taskComments.body,
  parentCommentId: taskComments.parentCommentId,
  createdAt: taskComments.createdAt,
  author: { id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl },
};

const activityActorCols = {
  id: taskActivityLog.id,
  taskId: taskActivityLog.taskId,
  actorId: taskActivityLog.actorId,
  eventType: taskActivityLog.eventType,
  oldVal: taskActivityLog.oldVal,
  newVal: taskActivityLog.newVal,
  createdAt: taskActivityLog.createdAt,
  actor: { id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl },
};

export const taskRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb(config.databaseUrl);

  // GET /v1/workspaces/:wid/tasks  — filterable, sortable
  app.get("/:wid/tasks", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const filters = filterSchema.parse(req.query);

    const conditions = [eq(tasks.workspaceId, wid), isNull(tasks.deletedAt)] as ReturnType<typeof eq>[];
    if (filters.status)     conditions.push(eq(tasks.status, filters.status));
    if (filters.assigneeId) conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    if (filters.priority)   conditions.push(eq(tasks.priority, filters.priority));

    const sortColMap = {
      created_at: tasks.createdAt,
      updated_at: tasks.updatedAt,
      due_date:   tasks.dueDate,
      priority:   tasks.priority,
    } as const;
    const sortCol = sortColMap[filters.sortBy];
    const order   = filters.sortDir === "asc" ? asc(sortCol) : desc(sortCol);

    const result = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(order)
      .limit(filters.limit);

    return reply.send({ data: result, meta: { nextCursor: null } });
  });

  // POST /v1/workspaces/:wid/tasks
  app.post("/:wid/tasks", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const body = createTaskSchema.parse(req.body);
    const [task] = await db
      .insert(tasks)
      .values({ ...body, workspaceId: wid, creatorId: req.user.sub, source: "manual" })
      .returning();

    await db.insert(taskActivityLog).values({
      taskId: task!.id,
      actorId: req.user.sub,
      eventType: "created",
      newVal: JSON.stringify({ title: task!.title, assigneeId: task!.assigneeId }),
    });

    if (task!.assigneeId && task!.assigneeId !== req.user.sub) {
      await db.insert(notifications).values({
        userId: task!.assigneeId,
        type: "task_assigned",
        payload: { taskId: task!.id, title: task!.title, workspaceId: wid },
      });
    }

    return reply.status(201).send({ data: task });
  });

  // POST /v1/workspaces/:wid/tasks/bulk
  app.post("/:wid/tasks/bulk", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const { items } = z.object({ items: z.array(createTaskSchema).max(100) }).parse(req.body);
    const inserted = await db
      .insert(tasks)
      .values(items.map((t) => ({ ...t, workspaceId: wid, creatorId: req.user.sub, source: "manual" as const })))
      .returning();

    if (inserted.length > 0) {
      await db.insert(taskActivityLog).values(
        inserted.map((t) => ({
          taskId: t.id,
          actorId: req.user.sub,
          eventType: "created",
          newVal: JSON.stringify({ title: t.title }),
        })),
      );
    }

    return reply.status(201).send({ data: inserted });
  });

  // GET /v1/workspaces/:wid/tasks/:tid  — includes comments (with author) + activity (with actor)
  app.get("/:wid/tasks/:tid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, tid } = req.params as { wid: string; tid: string };
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, tid), eq(tasks.workspaceId, wid), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Task not found" } });

    const comments = await db
      .select(commentAuthorCols)
      .from(taskComments)
      .innerJoin(users, eq(taskComments.authorId, users.id))
      .where(eq(taskComments.taskId, tid))
      .orderBy(asc(taskComments.createdAt));

    const activity = await db
      .select(activityActorCols)
      .from(taskActivityLog)
      .innerJoin(users, eq(taskActivityLog.actorId, users.id))
      .where(eq(taskActivityLog.taskId, tid))
      .orderBy(desc(taskActivityLog.createdAt));

    return reply.send({ data: { ...task, comments, activity } });
  });

  // PATCH /v1/workspaces/:wid/tasks/:tid
  app.patch("/:wid/tasks/:tid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, tid } = req.params as { wid: string; tid: string };
    const body = updateTaskSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, tid), eq(tasks.workspaceId, wid), isNull(tasks.deletedAt)))
      .limit(1);
    if (!existing) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Task not found" } });

    const [updated] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(tasks.id, tid), eq(tasks.workspaceId, wid), isNull(tasks.deletedAt)))
      .returning();

    const changedFields = (Object.keys(body) as (keyof typeof body)[]).filter(
      (k) => body[k] !== undefined && body[k] !== (existing as Record<string, unknown>)[k],
    );
    if (changedFields.length > 0) {
      const oldVal: Record<string, unknown> = {};
      const newVal: Record<string, unknown> = {};
      for (const k of changedFields) {
        oldVal[k] = (existing as Record<string, unknown>)[k];
        newVal[k] = body[k];
      }
      await db.insert(taskActivityLog).values({
        taskId: tid,
        actorId: req.user.sub,
        eventType: "updated",
        oldVal: JSON.stringify(oldVal),
        newVal: JSON.stringify(newVal),
      });
    }

    if (body.assigneeId && body.assigneeId !== existing.assigneeId && body.assigneeId !== req.user.sub) {
      await db.insert(notifications).values({
        userId: body.assigneeId,
        type: "task_assigned",
        payload: { taskId: tid, title: updated!.title, workspaceId: wid },
      });
    }

    return reply.send({ data: updated });
  });

  // DELETE /v1/workspaces/:wid/tasks/:tid  (soft delete)
  app.delete("/:wid/tasks/:tid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, tid } = req.params as { wid: string; tid: string };
    await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, tid), eq(tasks.workspaceId, wid)));
    await db.insert(taskActivityLog).values({
      taskId: tid,
      actorId: req.user.sub,
      eventType: "deleted",
    });
    return reply.send({ data: { ok: true } });
  });

  // POST /v1/workspaces/:wid/tasks/:tid/duplicate
  app.post("/:wid/tasks/:tid/duplicate", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, tid } = req.params as { wid: string; tid: string };
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, tid), eq(tasks.workspaceId, wid), isNull(tasks.deletedAt)))
      .limit(1);
    if (!existing) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Task not found" } });

    const [dup] = await db
      .insert(tasks)
      .values({
        workspaceId: wid,
        title: `${existing.title} (copy)`,
        description: existing.description,
        status: "todo",
        priority: existing.priority,
        assigneeId: existing.assigneeId,
        dueDate: existing.dueDate,
        source: existing.source as "manual" | "ai_meeting",
        meetingId: existing.meetingId,
        creatorId: req.user.sub,
      })
      .returning();

    await db.insert(taskActivityLog).values({
      taskId: dup!.id,
      actorId: req.user.sub,
      eventType: "created",
      newVal: JSON.stringify({ title: dup!.title, duplicatedFrom: tid }),
    });

    return reply.status(201).send({ data: dup });
  });

  // POST /v1/workspaces/:wid/tasks/:tid/comments
  app.post("/:wid/tasks/:tid/comments", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, tid } = req.params as { wid: string; tid: string };
    const body = commentSchema.parse(req.body);
    const [comment] = await db
      .insert(taskComments)
      .values({ taskId: tid, authorId: req.user.sub, ...body })
      .returning();

    // Return with author attached
    const [withAuthor] = await db
      .select(commentAuthorCols)
      .from(taskComments)
      .innerJoin(users, eq(taskComments.authorId, users.id))
      .where(eq(taskComments.id, comment!.id))
      .limit(1);

    const [task] = await db.select().from(tasks).where(eq(tasks.id, tid)).limit(1);
    if (task?.assigneeId && task.assigneeId !== req.user.sub) {
      await db.insert(notifications).values({
        userId: task.assigneeId,
        type: "task_commented",
        payload: { taskId: tid, title: task.title, workspaceId: wid },
      });
    }

    return reply.status(201).send({ data: withAuthor });
  });

  // POST /v1/workspaces/:wid/tasks/:tid/links
  app.post("/:wid/tasks/:tid/links", { preHandler: [authenticate] }, async (req, reply) => {
    const { tid } = req.params as { wid: string; tid: string };
    const body = linkSchema.parse(req.body);
    const [link] = await db
      .insert(taskLinks)
      .values({ sourceTaskId: tid, ...body })
      .returning();
    return reply.status(201).send({ data: link });
  });
};
