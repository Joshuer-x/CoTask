import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb, users, workspaceMembers } from "@cotask/db";
import { eq } from "drizzle-orm";
import { config } from "../config.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb(config.databaseUrl);

  // POST /v1/auth/register
  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const existing = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ error: { code: "EMAIL_TAKEN", message: "Email already registered" } });
    }
    const hashed = await bcrypt.hash(body.password, 12);
    const [user] = await db
      .insert(users)
      .values({ email: body.email.toLowerCase(), displayName: body.displayName, hashedPassword: hashed })
      .returning();
    const accessToken = app.jwt.sign({ sub: user!.id, wid: "", role: "member" }, { expiresIn: config.jwt.accessTtl });
    return reply.status(201).send({ data: { accessToken, expiresIn: config.jwt.accessTtl } });
  });

  // POST /v1/auth/login
  app.post("/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (!user?.hashedPassword) {
      return reply.status(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }
    const valid = await bcrypt.compare(body.password, user.hashedPassword);
    if (!valid) {
      return reply.status(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);
    const wid = membership[0]?.workspaceId ?? "";
    const role = (membership[0]?.role ?? "member") as "admin" | "member" | "guest";
    const accessToken = app.jwt.sign({ sub: user.id, wid, role }, { expiresIn: config.jwt.accessTtl });
    return reply.send({ data: { accessToken, expiresIn: config.jwt.accessTtl } });
  });

  // POST /v1/auth/refresh
  app.post("/refresh", async (req, reply) => {
    // Refresh token from HttpOnly cookie; rotate and return new access token
    try {
      const payload = req.jwt.verify<{ sub: string }>(req.cookies["refresh_token"] ?? "");
      const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
      if (!user) return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "User not found" } });
      const membership = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, user.id))
        .limit(1);
      const wid = membership[0]?.workspaceId ?? "";
      const role = (membership[0]?.role ?? "member") as "admin" | "member" | "guest";
      const accessToken = app.jwt.sign({ sub: user.id, wid, role }, { expiresIn: config.jwt.accessTtl });
      return reply.send({ data: { accessToken, expiresIn: config.jwt.accessTtl } });
    } catch {
      return reply.status(401).send({ error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token invalid or expired" } });
    }
  });

  // POST /v1/auth/logout
  app.post("/logout", async (_req, reply) => {
    reply.clearCookie("refresh_token");
    return reply.send({ data: { ok: true } });
  });
};
