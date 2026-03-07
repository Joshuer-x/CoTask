import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    // Zod validation errors
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
        },
      });
    }

    // Fastify's own validation errors (JSON schema)
    if (err.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: err.message,
          details: err.validation,
        },
      });
    }

    // Rate limit
    if (err.statusCode === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
    }

    // Known HTTP errors passed through
    if (err.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({
        error: { code: "REQUEST_ERROR", message: err.message },
      });
    }

    // Unexpected — log and return 500
    app.log.error({ err, traceId: _req.id }, "Unhandled error");
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });
}
