import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb, workspaces, workspaceMembers, users } from "@cotask/db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../plugins/auth.js";
import { config } from "../config.js";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb(config.databaseUrl);

  // POST /v1/workspaces — Create workspace
  app.post("/", { preHandler: [authenticate] }, async (req, reply) => {
    const body = createWorkspaceSchema.parse(req.body);
    const [ws] = await db.insert(workspaces).values({ name: body.name, slug: body.slug }).returning();
    await db.insert(workspaceMembers).values({
      workspaceId: ws!.id,
      userId: req.user.sub,
      role: "admin",
    });
    return reply.status(201).send({ data: ws });
  });

  // GET /v1/workspaces/:wid — Get workspace
  app.get("/:wid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, wid)).limit(1);
    if (!ws) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Workspace not found" } });
    return reply.send({ data: ws });
  });

  // GET /v1/workspaces/:wid/members — List members
  app.get("/:wid/members", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const members = await db
      .select({ workspaceId: workspaceMembers.workspaceId, userId: workspaceMembers.userId, role: workspaceMembers.role, joinedAt: workspaceMembers.joinedAt, user: { id: users.id, email: users.email, displayName: users.displayName, avatarUrl: users.avatarUrl } })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, wid));
    return reply.send({ data: members });
  });

  // POST /v1/workspaces/:wid/members — Invite member
  app.post("/:wid/members", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid } = req.params as { wid: string };
    const body = inviteMemberSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (!user) {
      return reply.status(404).send({ error: { code: "USER_NOT_FOUND", message: "No user found with that email" } });
    }
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: wid, userId: user.id, role: body.role })
      .onConflictDoNothing();
    return reply.status(201).send({ data: { ok: true } });
  });

  // PATCH /v1/workspaces/:wid/members/:uid — Update role
  app.patch("/:wid/members/:uid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, uid } = req.params as { wid: string; uid: string };
    const { role } = z.object({ role: z.enum(["admin", "member", "guest"]) }).parse(req.body);
    await db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, wid), eq(workspaceMembers.userId, uid)));
    return reply.send({ data: { ok: true } });
  });

  // DELETE /v1/workspaces/:wid/members/:uid — Remove member
  app.delete("/:wid/members/:uid", { preHandler: [authenticate] }, async (req, reply) => {
    const { wid, uid } = req.params as { wid: string; uid: string };
    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, wid), eq(workspaceMembers.userId, uid)));
    return reply.send({ data: { ok: true } });
  });
};
