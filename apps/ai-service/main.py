from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import structlog
from config import settings
from pipeline.ingestion import process_meeting_audio

log = structlog.get_logger()

app = FastAPI(title="CoTask AI Service", version="1.0.0")


def _verify_service_secret(secret: str) -> None:
    import hmac
    if not hmac.compare_digest(secret, settings.ai_service_secret):
        raise HTTPException(status_code=403, detail="Forbidden")


# ─── Internal: triggered by Bot Orchestrator after meeting ends ───────────────

class PipelineStartRequest(BaseModel):
    meeting_id: str
    audio_url: str


@app.post("/internal/pipeline/start")
async def start_pipeline(body: PipelineStartRequest, x_service_secret: str = Header("")):
    """
    Called by bot-orchestrator when a meeting recording is ready.
    Enqueues the full audio processing pipeline as a Celery task chain.
    """
    _verify_service_secret(x_service_secret)
    log.info("pipeline_start_requested", meeting_id=body.meeting_id)
    process_meeting_audio.delay(meeting_id=body.meeting_id, audio_url=body.audio_url)
    return {"ok": True, "meeting_id": body.meeting_id}


# ─── Internal: Bot join trigger (called by API service) ──────────────────────

class BotJoinRequest(BaseModel):
    meeting_id: str
    join_url: str
    platform: str


@app.post("/internal/bot/join")
async def trigger_bot_join(body: BotJoinRequest, x_service_secret: str = Header("")):
    """
    Relay bot join request from API service to the bot-orchestrator.
    AI service acts as a thin proxy here so the API only needs one internal URL.
    """
    _verify_service_secret(x_service_secret)
    import httpx
    import os
    bot_url = os.getenv("BOT_ORCHESTRATOR_URL", "http://localhost:3003")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{bot_url}/bot/join",
            json={"meetingId": body.meeting_id, "joinUrl": body.join_url, "platform": body.platform},
            headers={"x-service-secret": settings.ai_service_secret},
            timeout=15,
        )
        resp.raise_for_status()
    log.info("bot_join_relayed", meeting_id=body.meeting_id)
    return {"ok": True}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}
