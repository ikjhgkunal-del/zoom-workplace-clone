from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChannelCreate(BaseModel):
    id: Optional[str] = None
    name: str
    type: Optional[str] = "meeting"
    meeting_id: Optional[str] = None


class MessageCreate(BaseModel):
    sender_name: str
    sender_id: Optional[str] = ""
    is_self: Optional[bool] = False
    is_guest: Optional[bool] = False
    text: str
    created_at: Optional[str] = None


@router.get("/channels")
def get_channels():
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT id, name, type, meeting_id, created_at
        FROM chat_channels
        ORDER BY created_at ASC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/channels")
def create_channel(data: ChannelCreate):
    channel_id = data.id or f"channel-{int(datetime.now().timestamp() * 1000)}"
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO chat_channels (id, name, type, meeting_id)
            VALUES (?, ?, ?, ?)
        """, (channel_id, data.name, data.type or "channel", data.meeting_id))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    row = cur.execute("SELECT * FROM chat_channels WHERE id = ?", (channel_id,)).fetchone()
    conn.close()
    return dict(row)


@router.get("/channels/{channel_id}/messages")
def get_messages(channel_id: str):
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT id, channel_id, sender_name, sender_id, is_self, is_guest, text, created_at
        FROM chat_messages
        WHERE channel_id = ?
        ORDER BY id ASC
    """, (channel_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/channels/{channel_id}/messages")
def send_message(channel_id: str, data: MessageCreate):
    conn = get_db()
    cur = conn.cursor()

    # Ensure channel exists
    channel = cur.execute("SELECT id FROM chat_channels WHERE id = ?", (channel_id,)).fetchone()
    if not channel:
        m = cur.execute("SELECT title, meeting_id FROM meetings WHERE meeting_id = ?", (channel_id,)).fetchone()
        title = m["title"] if m else f"Meeting {channel_id}"
        cur.execute("""
            INSERT INTO chat_channels (id, name, type, meeting_id)
            VALUES (?, ?, 'meeting', ?)
        """, (channel_id, title, channel_id))

    created_at = data.created_at or datetime.now().strftime("%I:%M %p")

    cur.execute("""
        INSERT INTO chat_messages (channel_id, sender_name, sender_id, is_self, is_guest, text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        channel_id,
        data.sender_name,
        data.sender_id or "",
        1 if data.is_self else 0,
        1 if data.is_guest else 0,
        data.text,
        created_at
    ))
    conn.commit()
    msg_id = cur.lastrowid
    row = cur.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,)).fetchone()
    conn.close()
    return dict(row)
