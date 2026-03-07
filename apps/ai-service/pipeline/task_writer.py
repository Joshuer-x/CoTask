"""
Stage 8: Task Writer
Persists extracted action points to the database and notifies the API via WebSocket.
"""
from celery_app import celery
import structlog

log = structlog.get_logger()


def _confidence_label(score: float) -> str:
    if score >= 0.85:
        return "high"
    if score >= 0.60:
        return "medium"
    return "low"


@celery.task(bind=True, max_retries=3, default_retry_delay=5, name="pipeline.task_writer.run_task_writer")
def run_task_writer(self, meeting_id: str, action_points: list[dict]):
    log.info("task_writer_start", meeting_id=meeting_id, count=len(action_points))
    try:
        from models.db import insert_action_points, update_meeting_status, get_workspace_id_for_meeting
        from models.db import notify_api_service

        saved = insert_action_points(meeting_id, action_points)
        update_meeting_status(meeting_id, "completed")
        workspace_id = get_workspace_id_for_meeting(meeting_id)
        notify_api_service(workspace_id, meeting_id, saved)
        log.info("task_writer_complete", meeting_id=meeting_id)
    except Exception as exc:
        log.error("task_writer_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)
