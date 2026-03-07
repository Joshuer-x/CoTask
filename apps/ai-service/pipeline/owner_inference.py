"""
Stage 6 & 7: Owner Inference + Date Extraction
Resolves who owns each action point using the cascade defined in the tech spec.
"""
from celery_app import celery
from pipeline.task_writer import run_task_writer
import structlog, json

log = structlog.get_logger()

OWNER_INFERENCE_PROMPT = """Given a meeting action item and a list of meeting participants,
determine who should own this action item. Use these rules in order:
1. If a specific participant's name is mentioned explicitly, assign to them.
2. If the action uses "I" or "I'll", assign to the speaker.
3. If a role or team is mentioned (e.g., "Engineering"), assign to the matching participant.
4. If unclear, return null.

Output JSON: {"assignee_id": "<user_id or null>", "reason": "explicit_name|first_person|role_match|unresolved"}"""


@celery.task(bind=True, max_retries=3, default_retry_delay=10, name="pipeline.owner_inference.run_owner_inference")
def run_owner_inference(self, meeting_id: str, action_points: list[dict], transcript: list[dict]):
    log.info("owner_inference_start", meeting_id=meeting_id, count=len(action_points))
    try:
        from models.db import get_meeting_participants
        participants = get_meeting_participants(meeting_id)

        enriched = [_infer_owner(ap, participants, transcript) for ap in action_points]
        run_task_writer.delay(meeting_id=meeting_id, action_points=enriched)
        log.info("owner_inference_complete", meeting_id=meeting_id)
    except Exception as exc:
        log.error("owner_inference_failed", meeting_id=meeting_id, error=str(exc))
        raise self.retry(exc=exc)


def _infer_owner(ap: dict, participants: list[dict], transcript: list[dict]) -> dict:
    text = ap.get("text", "")
    speaker_label = ap.get("speaker_label")

    # Priority 1 & 2: Explicit name mention or first-person — try rule-based first
    for p in participants:
        name = p.get("display_name", "")
        if name and name.lower() in text.lower():
            ap["inferred_assignee_id"] = p["user_id"]
            ap["inference_reason"] = "explicit_name"
            return ap

    # Priority 3: First-person speaker
    if speaker_label and any(w in text.lower() for w in ["i'll", "i will", "i can", "i'll"]):
        speaker_user = next((p for p in participants if p.get("speaker_label") == speaker_label), None)
        if speaker_user:
            ap["inferred_assignee_id"] = speaker_user["user_id"]
            ap["inference_reason"] = "first_person"
            return ap

    # Priority 4 & 5: Role match or pronoun resolution — fall back to GPT-4o
    gpt_result = _gpt_owner_inference(ap, participants)
    ap.update(gpt_result)
    return ap


def _gpt_owner_inference(ap: dict, participants: list[dict]) -> dict:
    import openai
    from config import settings

    client = openai.OpenAI(api_key=settings.openai_api_key)
    participants_desc = json.dumps([
        {"user_id": p["user_id"], "name": p["display_name"], "role": p.get("role", "")}
        for p in participants
    ])

    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": OWNER_INFERENCE_PROMPT},
            {"role": "user", "content": f"Action item: {ap['text']}\nParticipants: {participants_desc}"},
        ],
        max_tokens=200,
    )
    try:
        result = json.loads(response.choices[0].message.content or "{}")
        return {
            "inferred_assignee_id": result.get("assignee_id"),
            "inference_reason": result.get("reason", "unresolved"),
        }
    except json.JSONDecodeError:
        return {"inferred_assignee_id": None, "inference_reason": "unresolved"}
