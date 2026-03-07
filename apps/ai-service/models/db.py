"""
Database helpers for the AI service (uses raw psycopg2 for simplicity in workers).
"""
import psycopg2, psycopg2.extras, os, httpx
from config import settings


def _conn():
    return psycopg2.connect(settings.database_url, cursor_factory=psycopg2.extras.RealDictCursor)


def get_meeting_participants(meeting_id: str) -> list[dict]:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT mp.speaker_label, mp.user_id, u.display_name, wm.role
            FROM meeting_participants mp
            JOIN users u ON u.id = mp.user_id
            JOIN meetings m ON m.id = mp.meeting_id
            JOIN workspace_members wm ON wm.user_id = mp.user_id AND wm.workspace_id = m.workspace_id
            WHERE mp.meeting_id = %s
            """,
            (meeting_id,),
        )
        return [dict(row) for row in cur.fetchall()]


def insert_action_points(meeting_id: str, action_points: list[dict]) -> list[dict]:
    saved = []
    with _conn() as conn, conn.cursor() as cur:
        for ap in action_points:
            cur.execute(
                """
                INSERT INTO action_points
                  (meeting_id, raw_text, normalized_text, inferred_assignee_id,
                   inference_reason, confidence, due_date_hint)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, meeting_id, normalized_text, inferred_assignee_id,
                          inference_reason, confidence, due_date_hint
                """,
                (
                    meeting_id,
                    ap.get("raw_text", ap.get("text", "")),
                    ap.get("text", ""),
                    ap.get("inferred_assignee_id"),
                    ap.get("inference_reason", "unresolved"),
                    ap.get("confidence", 0.5),
                    ap.get("due_date_hint"),
                ),
            )
            saved.append(dict(cur.fetchone()))
        conn.commit()
    return saved


def update_meeting_status(meeting_id: str, status: str) -> None:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE meetings SET status = %s, ended_at = NOW() WHERE id = %s",
            (status, meeting_id),
        )
        conn.commit()


def get_workspace_id_for_meeting(meeting_id: str) -> str:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT workspace_id FROM meetings WHERE id = %s", (meeting_id,))
        row = cur.fetchone()
        return str(row["workspace_id"]) if row else ""


def notify_api_service(workspace_id: str, meeting_id: str, action_points: list[dict]) -> None:
    """Push action_points:ready event through the API service's internal WebSocket bridge."""
    api_url = os.getenv("AI_SERVICE_URL", "http://localhost:3001")
    secret = settings.ai_service_secret
    try:
        httpx.post(
            f"{api_url}/internal/ws/emit",
            json={"workspace_id": workspace_id, "meeting_id": meeting_id, "action_points": action_points},
            headers={"x-service-secret": secret},
            timeout=10,
        )
    except Exception:
        pass  # Non-critical; clients will poll on reconnect
