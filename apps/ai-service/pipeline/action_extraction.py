"""
Stage 5: Action Point Extraction
Uses GPT-4o with a sliding window over the diarized transcript to identify action items.
"""
from celery_app import celery
from pipeline.owner_inference import run_owner_inference
import structlog, json

log = structlog.get_logger()

EXTRACTION_SYSTEM_PROMPT = """You are an AI assistant that extracts action items from meeting transcripts.
Given a segment of a meeting transcript, identify any action items — things that someone committed to doing,
was asked to do, or that were assigned to be done.

For each action item, output JSON with:
- "text": the cleaned, normalized action item description (imperative form)
- "raw_text": the verbatim quote from the transcript
- "speaker_label": the speaker label of the person who owns the action (if determinable)
- "due_date_hint": ISO date string if a deadline was mentioned, otherwise null
- "confidence": 0.0–1.0 confidence this is a real action item

Only output a JSON array. If there are no action items, output [].
Do NOT include meeting discussion, decisions, or general updates — only concrete actions."""

CHUNK_SIZE = 20  # utterances per sliding window
OVERLAP = 3


@celery.task(bind=True, max_retries=3, default_retry_delay=10, name="pipeline.action_extraction.run_action_extraction")
def run_action_extraction(self, meeting_id: str, diarized_transcript: list[dict]):
    log.info("extraction_start", meeting_id=meeting_id, utterances=len(diarized_transcript))
    try:
        raw_action_points = _extract_action_points(diarized_transcript)
        deduped = _deduplicate(raw_action_points)
        run_owner_inference.delay(meeting_id=meeting_id, action_points=deduped, transcript=diarized_transcript)
        log.info("extraction_complete", meeting_id=meeting_id, count=len(deduped))
    except Exception as exc:
        log.error("extraction_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)


def _extract_action_points(transcript: list[dict]) -> list[dict]:
    import openai
    from config import settings

    client = openai.OpenAI(api_key=settings.openai_api_key)
    all_points: list[dict] = []

    chunks = _chunk_transcript(transcript)
    for chunk in chunks:
        transcript_text = "\n".join(
            f"[{utt['speaker_label']}]: {utt['text']}" for utt in chunk
        )
        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Transcript segment:\n{transcript_text}"},
            ],
            max_tokens=2000,
        )
        content = response.choices[0].message.content or "[]"
        try:
            parsed = json.loads(content)
            items = parsed if isinstance(parsed, list) else parsed.get("items", [])
            all_points.extend(items)
        except json.JSONDecodeError:
            log.warning("extraction_json_parse_error", content=content[:200])

    return all_points


def _chunk_transcript(transcript: list[dict]) -> list[list[dict]]:
    chunks = []
    i = 0
    while i < len(transcript):
        chunks.append(transcript[i : i + CHUNK_SIZE])
        i += CHUNK_SIZE - OVERLAP
    return chunks


def _deduplicate(action_points: list[dict]) -> list[dict]:
    """Remove near-duplicate action points using simple text similarity."""
    seen: list[str] = []
    deduped: list[dict] = []
    for ap in action_points:
        text = ap.get("text", "").lower()
        if not any(_similarity(text, s) > 0.85 for s in seen):
            seen.append(text)
            deduped.append(ap)
    return deduped


def _similarity(a: str, b: str) -> float:
    """Jaccard similarity on word sets as a lightweight dedup heuristic."""
    set_a, set_b = set(a.split()), set(b.split())
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)
