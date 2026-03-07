"""
Stage 1: Audio Ingestion
Downloads audio from Recall.ai, stores temporarily in S3, kicks off STT.
"""
from celery_app import celery
from pipeline.transcription import run_transcription
import structlog

log = structlog.get_logger()


@celery.task(bind=True, max_retries=3, default_retry_delay=10, name="pipeline.ingestion.process_meeting_audio")
def process_meeting_audio(self, meeting_id: str, audio_url: str):
    log.info("ingestion_start", meeting_id=meeting_id)
    try:
        # Download audio from Recall.ai presigned URL and upload to S3
        s3_key = _download_and_store(meeting_id, audio_url)
        # Chain to transcription
        run_transcription.delay(meeting_id=meeting_id, s3_key=s3_key)
        log.info("ingestion_complete", meeting_id=meeting_id, s3_key=s3_key)
    except Exception as exc:
        log.error("ingestion_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)


def _download_and_store(meeting_id: str, audio_url: str) -> str:
    """Downloads audio and stores in S3. Returns the S3 key."""
    import httpx, boto3, io
    from config import settings

    response = httpx.get(audio_url, follow_redirects=True, timeout=120)
    response.raise_for_status()

    s3 = boto3.client("s3", region_name=settings.aws_region)
    s3_key = f"audio/{meeting_id}/raw.webm"
    s3.upload_fileobj(io.BytesIO(response.content), settings.s3_bucket_name, s3_key)

    return s3_key
