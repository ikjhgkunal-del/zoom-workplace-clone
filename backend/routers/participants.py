from fastapi import APIRouter, HTTPException
from database import get_db
from models import ParticipantJoin
from datetime import datetime

router = APIRouter(prefix="/meetings", tags=["participants"])


def row_to_dict(row):
    return dict(row) if row else None


@router.post("/{meeting_id}/join")
def join_meeting(meeting_id: str, data: ParticipantJoin):
    """Add a participant to a meeting. Validates meeting existence and status."""
    conn = get_db()
    cur = conn.cursor()
    try:
        meeting = cur.execute(
            "SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)
        ).fetchone()

        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        if meeting["status"] == "ended":
            raise HTTPException(status_code=400, detail="Meeting has already ended")

        # Mark meeting as active if it was scheduled
        if meeting["status"] == "scheduled":
            cur.execute(
                "UPDATE meetings SET status = 'active' WHERE meeting_id = ?", (meeting_id,)
            )

        cur.execute("""
            INSERT INTO participants (meeting_id, display_name, is_host, joined_at)
            VALUES (?, ?, ?, ?)
        """, (meeting_id, data.display_name, 1 if data.is_host else 0, datetime.now().isoformat()))

        conn.commit()
        row = cur.execute(
            "SELECT * FROM participants WHERE meeting_id = ? AND display_name = ? ORDER BY id DESC LIMIT 1",
            (meeting_id, data.display_name)
        ).fetchone()
        return row_to_dict(row)
    finally:
        conn.close()


@router.get("/{meeting_id}/participants")
def list_participants(meeting_id: str):
    """Get all active participants currently in the meeting."""
    conn = get_db()
    cur = conn.cursor()
    try:
        meeting = cur.execute(
            "SELECT id FROM meetings WHERE meeting_id = ?", (meeting_id,)
        ).fetchone()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        rows = cur.execute("""
            SELECT * FROM participants
            WHERE meeting_id = ? AND left_at IS NULL
            ORDER BY is_host DESC, joined_at ASC
        """, (meeting_id,)).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


@router.put("/{meeting_id}/participants/{participant_id}/leave")
def leave_meeting(meeting_id: str, participant_id: int):
    """Mark a participant as having left the meeting."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE participants SET left_at = ? WHERE id = ? AND meeting_id = ?
        """, (datetime.now().isoformat(), participant_id, meeting_id))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


@router.put("/{meeting_id}/participants/{participant_id}/mute")
def toggle_mute(meeting_id: str, participant_id: int, muted: bool):
    """Toggle mute state for a participant."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE participants SET is_muted = ? WHERE id = ? AND meeting_id = ?
        """, (1 if muted else 0, participant_id, meeting_id))
        conn.commit()
        return {"success": True, "is_muted": muted}
    finally:
        conn.close()
