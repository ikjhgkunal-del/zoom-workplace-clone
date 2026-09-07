import sqlite3
import random
import string
from datetime import datetime, timedelta

import os

DB_PATH = "zoom_clone.db"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def generate_meeting_id():
    digits = "".join(random.choices(string.digits, k=11))
    return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"


def generate_invite_link(meeting_id: str) -> str:
    return f"{FRONTEND_URL}/join?meetingId={meeting_id}"


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # --- Create Tables ---
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            host_name TEXT DEFAULT 'test one',
            host_email TEXT DEFAULT 'testone@example.com',
            start_time DATETIME,
            end_time DATETIME,
            duration INTEGER DEFAULT 60,
            invite_link TEXT,
            is_instant INTEGER DEFAULT 0,
            status TEXT DEFAULT 'scheduled',
            passcode TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            is_host INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            left_at DATETIME,
            is_muted INTEGER DEFAULT 0,
            video_on INTEGER DEFAULT 1,
            FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
        );

        CREATE TABLE IF NOT EXISTS meeting_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id TEXT UNIQUE NOT NULL,
            waiting_room INTEGER DEFAULT 0,
            mute_on_entry INTEGER DEFAULT 0,
            allow_screen_share INTEGER DEFAULT 1,
            record_meeting INTEGER DEFAULT 0,
            FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
        );

        CREATE TABLE IF NOT EXISTS chat_channels (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'meeting',
            meeting_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            sender_id TEXT,
            is_self INTEGER DEFAULT 0,
            is_guest INTEGER DEFAULT 0,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES chat_channels(id)
        );
    """)

    # --- Seed Data (only if meetings table is empty) ---
    existing = cur.execute("SELECT COUNT(*) FROM meetings").fetchone()[0]
    if existing == 0:
        now = datetime.now()

        seed_meetings = [
            {
                "meeting_id": "123-456-7890",
                "title": "test one's Zoom Meeting",
                "description": "Daily standup with the team",
                "host_name": "test one",
                "host_email": "testone@example.com",
                "start_time": now.replace(hour=12, minute=45, second=0).isoformat(),
                "end_time": now.replace(hour=13, minute=46, second=0).isoformat(),
                "duration": 60,
                "invite_link": "http://localhost:3000/join?meetingId=123-456-7890",
                "is_instant": 0,
                "status": "scheduled",
                "passcode": "",
            },
            {
                "meeting_id": "987-654-3210",
                "title": "Product Design Review",
                "description": "Weekly design sync with stakeholders",
                "host_name": "test one",
                "host_email": "testone@example.com",
                "start_time": (now + timedelta(days=1)).replace(hour=10, minute=0, second=0).isoformat(),
                "end_time": (now + timedelta(days=1)).replace(hour=11, minute=0, second=0).isoformat(),
                "duration": 60,
                "invite_link": "http://localhost:3000/join?meetingId=987-654-3210",
                "is_instant": 0,
                "status": "scheduled",
                "passcode": "abc123",
            },
            {
                "meeting_id": "555-123-9876",
                "title": "Sprint Planning - Q3",
                "description": "Sprint planning for the upcoming quarter",
                "host_name": "test one",
                "host_email": "testone@example.com",
                "start_time": (now + timedelta(days=2)).replace(hour=14, minute=30, second=0).isoformat(),
                "end_time": (now + timedelta(days=2)).replace(hour=16, minute=30, second=0).isoformat(),
                "duration": 120,
                "invite_link": "http://localhost:3000/join?meetingId=555-123-9876",
                "is_instant": 0,
                "status": "scheduled",
                "passcode": "",
            },
            {
                "meeting_id": "111-222-3333",
                "title": "Team Retrospective",
                "description": "End-of-sprint retrospective",
                "host_name": "test one",
                "host_email": "testone@example.com",
                "start_time": (now - timedelta(days=1)).replace(hour=15, minute=0, second=0).isoformat(),
                "end_time": (now - timedelta(days=1)).replace(hour=16, minute=0, second=0).isoformat(),
                "duration": 60,
                "invite_link": "http://localhost:3000/join?meetingId=111-222-3333",
                "is_instant": 0,
                "status": "ended",
                "passcode": "",
            },
            {
                "meeting_id": "444-555-6666",
                "title": "Client Demo",
                "description": "Product demo for new client",
                "host_name": "test one",
                "host_email": "testone@example.com",
                "start_time": (now - timedelta(days=3)).replace(hour=11, minute=0, second=0).isoformat(),
                "end_time": (now - timedelta(days=3)).replace(hour=12, minute=0, second=0).isoformat(),
                "duration": 60,
                "invite_link": "http://localhost:3000/join?meetingId=444-555-6666",
                "is_instant": 0,
                "status": "ended",
                "passcode": "",
            },
        ]

        for m in seed_meetings:
            cur.execute("""
                INSERT INTO meetings
                (meeting_id, title, description, host_name, host_email, start_time, end_time,
                 duration, invite_link, is_instant, status, passcode)
                VALUES (:meeting_id, :title, :description, :host_name, :host_email,
                        :start_time, :end_time, :duration, :invite_link, :is_instant, :status, :passcode)
            """, m)
            cur.execute("""
                INSERT INTO meeting_settings (meeting_id) VALUES (?)
            """, (m["meeting_id"],))

        # Seed participants for first meeting
        seed_participants = [
            ("123-456-7890", "test one", 1),
            ("123-456-7890", "Alice Johnson", 0),
            ("123-456-7890", "Bob Smith", 0),
        ]
        for mp in seed_participants:
            cur.execute("""
                INSERT INTO participants (meeting_id, display_name, is_host)
                VALUES (?, ?, ?)
            """, mp)

    # --- Ensure Personal Meeting ID (PMI) exists ---
    pmi_row = cur.execute("SELECT id FROM meetings WHERE meeting_id = '629-892-4224'").fetchone()
    if not pmi_row:
        pmi_now = datetime.now()
        cur.execute("""
            INSERT INTO meetings
            (meeting_id, title, description, host_name, host_email, start_time, end_time,
             duration, invite_link, is_instant, status, passcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "629-892-4224",
            "My Personal Meeting ID (PMI)",
            "Personal Meeting Room for test one",
            "test one",
            "testone@example.com",
            pmi_now.isoformat(),
            (pmi_now + timedelta(days=365)).isoformat(),
            60,
            "http://localhost:3000/join?meetingId=629-892-4224",
            0,
            "scheduled",
            "123456"
        ))
        cur.execute("INSERT OR IGNORE INTO meeting_settings (meeting_id) VALUES ('629-892-4224')")
        cur.execute("""
            INSERT OR IGNORE INTO chat_channels (id, name, type, meeting_id)
            VALUES ('629-892-4224', 'My Personal Meeting ID (PMI)', 'meeting', '629-892-4224')
        """)

    conn.commit()
    conn.close()

