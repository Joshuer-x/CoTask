"""
Stage 3 & 4: Speaker Diarization + Resolution
Maps each utterance to a speaker label, then resolves labels to workspace user IDs.
"""
from celery_app import celery
from pipeline.action_extraction import run_action_extraction
import structlog

log = structlog.get_logger()


@celery.task(bind=True, max_retries=3, default_retry_delay=15, name="pipeline.diarization.run_diarization")
def run_diarization(self, meeting_id: str, transcript: list[dict]):
    log.info("diarization_start", meeting_id=meeting_id)
    try:
        diarized = _diarize(transcript)
        resolved = _resolve_speakers(meeting_id, diarized)
        run_action_extraction.delay(meeting_id=meeting_id, diarized_transcript=resolved)
        log.info("diarization_complete", meeting_id=meeting_id)
    except Exception as exc:
        log.error("diarization_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)


def _diarize(transcript: list[dict]) -> list[dict]:
    """
    Assigns speaker labels to utterances.
    Production: use pyannote/speaker-diarization-3.1.
    Fallback: each utterance gets speaker label 'SPEAKER_UNKNOWN'.
    """
    # TODO: integrate pyannote.audio for real diarization
    for utt in transcript:
        utt["speaker_label"] = "SPEAKER_UNKNOWN"
    return transcript


def _resolve_speakers(meeting_id: str, diarized: list[dict]) -> list[dict]:
    """
    Maps speaker labels to workspace user IDs using meeting_participants table.
    Name-mention heuristic + voice embedding cache (future).
    """
    from models.db import get_meeting_participants
    participants = get_meeting_participants(meeting_id)
    label_to_user = {p["speaker_label"]: p["user_id"] for p in participants if p.get("speaker_label")}

    for utt in diarized:
        utt["user_id"] = label_to_user.get(utt["speaker_label"])

    return diarized
