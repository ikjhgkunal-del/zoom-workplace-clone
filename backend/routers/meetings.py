from fastapi import APIRouter, HTTPException
from database import get_db, generate_meeting_id, generate_invite_link
from models import MeetingCreate, MeetingUpdate, MeetingResponse, StatusUpdate
from datetime import datetime, timedelta

router = APIRouter(prefix="/meetings", tags=["meetings"])


def row_to_dict(row):
    return dict(row) if row else None


@router.post("/instant")
def create_instant_meeting(host_name: str = "test one"):
    """Create an instant meeting immediately."""
    conn = get_db()
    cur = conn.cursor()
    try:
        meeting_id = generate_meeting_id()
        invite_link = generate_invite_link(meeting_id)
        now = datetime.now()
        end_time = now + timedelta(hours=1)

        cur.execute("""
            INSERT INTO meetings
            (meeting_id, title, host_name, host_email, start_time, end_time,
             duration, invite_link, is_instant, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            meeting_id,
            f"{host_name}'s Zoom Meeting",
            host_name,
            "testone@example.com",
            now.isoformat(),
            end_time.isoformat(),
            60,
            invite_link,
            1,
            "active"
        ))
        cur.execute("INSERT INTO meeting_settings (meeting_id) VALUES (?)", (meeting_id,))
        # Add host as participant
        cur.execute("""
            INSERT INTO participants (meeting_id, display_name, is_host)
            VALUES (?, ?, 1)
        """, (meeting_id, host_name))
        # Create continuous meeting chat channel
        cur.execute("""
            INSERT OR IGNORE INTO chat_channels (id, name, type, meeting_id)
            VALUES (?, ?, 'meeting', ?)
        """, (meeting_id, f"{host_name}'s Zoom Meeting", meeting_id))
        conn.commit()

        row = cur.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        return row_to_dict(row)
    finally:
        conn.close()


@router.post("/schedule")
def schedule_meeting(data: MeetingCreate):
    """Schedule a new meeting."""
    conn = get_db()
    cur = conn.cursor()
    try:
        if data.meeting_id and data.meeting_id.strip():
            meeting_id = data.meeting_id.strip()
            # If meeting exists (e.g. PMI), update or replace
            cur.execute("DELETE FROM meetings WHERE meeting_id = ?", (meeting_id,))
        else:
            meeting_id = generate_meeting_id()

        invite_link = generate_invite_link(meeting_id)
        start_time = data.start_time or datetime.now()
        end_time = data.end_time or (start_time + timedelta(minutes=data.duration))

        cur.execute("""
            INSERT INTO meetings
            (meeting_id, title, description, host_name, host_email, start_time, end_time,
             duration, invite_link, is_instant, status, passcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'scheduled', ?)
        """, (
            meeting_id,
            data.title,
            data.description or "",
            data.host_name,
            "testone@example.com",
            start_time.isoformat(),
            end_time.isoformat(),
            data.duration,
            invite_link,
            data.passcode or ""
        ))
        cur.execute("""
            INSERT OR REPLACE INTO meeting_settings (meeting_id, waiting_room, mute_on_entry, allow_screen_share)
            VALUES (?, ?, ?, ?)
        """, (meeting_id, int(data.waiting_room or False), int(data.mute_on_entry or False), int(data.allow_screen_share if data.allow_screen_share is not None else 1)))
        
        # Create continuous meeting chat channel
        cur.execute("""
            INSERT OR IGNORE INTO chat_channels (id, name, type, meeting_id)
            VALUES (?, ?, 'meeting', ?)
        """, (meeting_id, data.title, meeting_id))
        conn.commit()

        row = cur.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        return row_to_dict(row)
    finally:
        conn.close()


@router.get("")
def list_meetings(filter: str = "all"):
    """
    List meetings. filter: all | upcoming | recent | today
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        now = datetime.now().isoformat()
        today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
        today_end = datetime.now().replace(hour=23, minute=59, second=59).isoformat()

        if filter == "upcoming":
            rows = cur.execute("""
                SELECT * FROM meetings WHERE start_time >= ? AND status != 'ended'
                ORDER BY start_time ASC
            """, (now,)).fetchall()
        elif filter == "recent":
            rows = cur.execute("""
                SELECT * FROM meetings WHERE status = 'ended'
                ORDER BY end_time DESC LIMIT 10
            """).fetchall()
        elif filter == "today":
            rows = cur.execute("""
                SELECT * FROM meetings WHERE start_time BETWEEN ? AND ?
                ORDER BY start_time ASC
            """, (today_start, today_end)).fetchall()
        else:
            rows = cur.execute("""
                SELECT * FROM meetings ORDER BY start_time DESC
            """).fetchall()

        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str):
    """Get a single meeting by ID — validates existence."""
    conn = get_db()
    cur = conn.cursor()
    try:
        row = cur.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return row_to_dict(row)
    finally:
        conn.close()


@router.put("/{meeting_id}/status")
def update_meeting_status(meeting_id: str, data: StatusUpdate):
    """Update meeting status: scheduled | active | ended"""
    conn = get_db()
    cur = conn.cursor()
    try:
        row = cur.execute("SELECT id FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        cur.execute(
            "UPDATE meetings SET status = ? WHERE meeting_id = ?",
            (data.status, meeting_id)
        )
        conn.commit()
        return {"success": True, "meeting_id": meeting_id, "status": data.status}
    finally:
        conn.close()


@router.put("/{meeting_id}")
def update_meeting(meeting_id: str, data: MeetingUpdate):
    """Update meeting fields (title, description, start_time, duration, passcode)."""
    conn = get_db()
    cur = conn.cursor()
    try:
        row = cur.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        updates = []
        params = []
        if data.title is not None:
            updates.append("title = ?")
            params.append(data.title)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)
        if data.start_time is not None:
            updates.append("start_time = ?")
            params.append(data.start_time.isoformat())
        if data.duration is not None:
            updates.append("duration = ?")
            params.append(data.duration)
        if data.passcode is not None:
            updates.append("passcode = ?")
            params.append(data.passcode)
            
        if updates:
            params.append(meeting_id)
            cur.execute(f"UPDATE meetings SET {', '.join(updates)} WHERE meeting_id = ?", params)
            # Also update continuous chat channel name if title changed
            if data.title is not None:
                cur.execute("UPDATE chat_channels SET name = ? WHERE meeting_id = ?", (data.title, meeting_id))
            conn.commit()
            
        updated = cur.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,)).fetchone()
        return row_to_dict(updated)
    finally:
        conn.close()


@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str):
    """Delete a meeting."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM participants WHERE meeting_id = ?", (meeting_id,))
        cur.execute("DELETE FROM meeting_settings WHERE meeting_id = ?", (meeting_id,))
        cur.execute("DELETE FROM meetings WHERE meeting_id = ?", (meeting_id,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()
