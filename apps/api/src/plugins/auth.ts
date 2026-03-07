import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload, WorkspaceRole } from "@cotask/types";

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}

export function requireRole(...roles: WorkspaceRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply);
    if (!roles.includes(req.user.role)) {
      reply.status(403).send({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
    }
  };
}
