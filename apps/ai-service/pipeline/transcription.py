"""
Stage 2: Speech-to-Text
Uses OpenAI Whisper (API) to transcribe audio chunks.
Self-hosted Whisper on GPU is the primary path; OpenAI API is the fallback.
"""
from celery_app import celery
from pipeline.diarization import run_diarization
import structlog

log = structlog.get_logger()


@celery.task(bind=True, max_retries=3, default_retry_delay=15, name="pipeline.transcription.run_transcription")
def run_transcription(self, meeting_id: str, s3_key: str):
    log.info("transcription_start", meeting_id=meeting_id)
    try:
        transcript = _transcribe(s3_key)
        run_diarization.delay(meeting_id=meeting_id, transcript=transcript)
        log.info("transcription_complete", meeting_id=meeting_id, utterances=len(transcript))
    except Exception as exc:
        log.error("transcription_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)


def _transcribe(s3_key: str) -> list[dict]:
    """
    Returns list of utterances: [{"start": float, "end": float, "text": str}]
    Uses OpenAI Whisper API. Swap with self-hosted Whisper for production.
    """
    import boto3, io, openai
    from config import settings

    client = openai.OpenAI(api_key=settings.openai_api_key)
    s3 = boto3.client("s3", region_name=settings.aws_region)

    obj = s3.get_object(Bucket=settings.s3_bucket_name, Key=s3_key)
    audio_bytes = obj["Body"].read()

    # Whisper API accepts up to 25MB; chunk larger files
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.webm", io.BytesIO(audio_bytes), "audio/webm"),
        response_format="verbose_json",
        timestamp_granularities=["segment"],
    )

    return [
        {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
        for seg in (response.segments or [])
    ]
