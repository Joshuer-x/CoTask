import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import IORedis from "ioredis";
import { createHmac, timingSafeEqual } from "crypto";
import { createBot, removeBot } from "./recall.client.js";

const app = Fastify({ logger: true });
const PORT = Number(process.env["BOT_ORCHESTRATOR_PORT"] ?? 3003);
const AI_SERVICE_URL = process.env["AI_SERVICE_URL"] ?? "http://localhost:8000";
const SERVICE_SECRET = process.env["AI_SERVICE_SECRET"] ?? "";
const RECALL_WEBHOOK_SECRET = process.env["RECALL_AI_WEBHOOK_SECRET"] ?? "";
const MAX_MEETING_MINUTES = 180;

const redis = new IORedis(process.env["REDIS_URL"] ?? "redis://localhost:6379");

await app.register(rawBody, { field: "rawBody", global: false, encoding: "utf8", runFirst: true });

// ─── Internal: triggered by API service after meeting creation ────────────────

app.post<{ Body: { meetingId: string; joinUrl: string; platform: string } }>(
  "/bot/join",
  async (req, reply) => {
    if (req.headers["x-service-secret"] !== SERVICE_SECRET) {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const { meetingId, joinUrl } = req.body;

    // Enforce per-workspace concurrent bot limit (use global counter for now)
    const activeBots = await redis.incr("bots:active:global");
    if (activeBots > 50) {
      await redis.decr("bots:active:global");
      return reply.status(429).send({ error: "Bot capacity reached. Try again shortly." });
    }

    try {
      const bot = await createBot({ meetingUrl: joinUrl, meetingId });

      // Store bot session state in Redis (24h TTL)
      const sessionKey = `bot:${bot.id}`;
      await redis.setex(
        sessionKey,
        86400,
        JSON.stringify({
          meeting_id: meetingId,
          started_at: new Date().toISOString(),
          status: "joining",
          chunk_count: 0,
        }),
      );

      // Schedule max-duration enforcement
      setTimeout(async () => {
        const raw = await redis.get(sessionKey);
        if (!raw) return;
        const session = JSON.parse(raw) as { status: string };
        if (session.status === "active" || session.status === "joining") {
          app.log.warn({ botId: bot.id }, "Removing bot: max duration reached");
          await removeBot(bot.id);
        }
      }, MAX_MEETING_MINUTES * 60 * 1000);

      app.log.info({ botId: bot.id, meetingId }, "Bot created");
      return reply.send({ ok: true, botId: bot.id });
    } catch (err) {
      await redis.decr("bots:active:global");
      throw err;
    }
  },
);

// ─── Recall.ai Webhook ────────────────────────────────────────────────────────

app.post(
  "/webhooks/recall",
  { config: { rawBody: true } },
  async (req, reply) => {
    // Verify HMAC-SHA256 signature
    const signature = req.headers["recall-signature"] as string | undefined;
    const rawBodyStr = (req as unknown as { rawBody: string }).rawBody;

    if (RECALL_WEBHOOK_SECRET && signature) {
      const expected = createHmac("sha256", RECALL_WEBHOOK_SECRET)
        .update(rawBodyStr)
        .digest("hex");
      const expectedBuf = Buffer.from(expected);
      const sigBuf = Buffer.from(signature);
      if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
        return reply.status(401).send({ error: "Invalid webhook signature" });
      }
    }

    const payload = req.body as Record<string, unknown>;
    const event = payload["event"] as string;
    const data = (payload["data"] ?? {}) as Record<string, unknown>;
    const botId = data["bot_id"] as string | undefined;

    if (!botId) return reply.send({ ok: true });

    const sessionKey = `bot:${botId}`;
    const rawSession = await redis.get(sessionKey);
    const session = rawSession ? (JSON.parse(rawSession) as Record<string, unknown>) : null;

    app.log.info({ event, botId, meetingId: session?.["meeting_id"] }, "Recall webhook received");

    switch (event) {
      case "bot.joining_call": {
        if (session) {
          session["status"] = "joining";
          await redis.setex(sessionKey, 86400, JSON.stringify(session));
        }
        break;
      }

      case "bot.in_call_not_recording":
      case "bot.in_call_recording": {
        if (session) {
          session["status"] = "active";
          await redis.setex(sessionKey, 86400, JSON.stringify(session));
        }
        // Notify API service to update meeting status → active
        if (session?.["meeting_id"]) {
          await notifyApiMeetingStatus(session["meeting_id"] as string, "active");
        }
        break;
      }

      case "bot.done": {
        // Meeting ended — forward to AI service to kick off processing pipeline
        const mediaUrl = (data["media_url"] ?? (data["recording"] as Record<string, unknown>)?.["mp4"]) as string | undefined;
        const meetingId = session?.["meeting_id"] as string | undefined;

        if (meetingId && mediaUrl) {
          await notifyApiMeetingStatus(meetingId, "processing");
          await triggerAiPipeline(meetingId, mediaUrl);
        }

        if (session) {
          session["status"] = "ended";
          await redis.setex(sessionKey, 3600, JSON.stringify(session));
          await redis.decr("bots:active:global");
        }
        break;
      }

      case "bot.fatal_error": {
        app.log.error({ botId, data }, "Bot fatal error");
        if (session?.["meeting_id"]) {
          await notifyApiMeetingStatus(session["meeting_id"] as string, "failed");
        }
        if (session) {
          session["status"] = "error";
          await redis.setex(sessionKey, 3600, JSON.stringify(session));
          await redis.decr("bots:active:global");
        }
        break;
      }
    }

    return reply.send({ ok: true });
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function notifyApiMeetingStatus(meetingId: string, status: string) {
  const API_URL = process.env["API_URL"] ?? "http://localhost:3001";
  await fetch(`${API_URL}/internal/meeting-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-service-secret": SERVICE_SECRET },
    body: JSON.stringify({ meetingId, status }),
  }).catch((e) => app.log.error({ e }, "Failed to notify API of meeting status"));
}

async function triggerAiPipeline(meetingId: string, audioUrl: string) {
  await fetch(`${AI_SERVICE_URL}/internal/pipeline/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-service-secret": SERVICE_SECRET },
    body: JSON.stringify({ meeting_id: meetingId, audio_url: audioUrl }),
  }).catch((e) => app.log.error({ e }, "Failed to trigger AI pipeline"));
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async () => ({ status: "ok" }));

await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`Bot orchestrator running on port ${PORT}`);
