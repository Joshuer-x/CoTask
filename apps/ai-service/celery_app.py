from celery import Celery
from config import settings

celery = Celery(
    "cotask-ai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "pipeline.ingestion",
        "pipeline.transcription",
        "pipeline.diarization",
        "pipeline.action_extraction",
        "pipeline.owner_inference",
        "pipeline.task_writer",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Retry policy for the whole pipeline
    task_max_retries=3,
    task_default_retry_delay=5,
)
