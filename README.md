# Zoom Workplace Clone — Full-Stack Video Conferencing Platform

A full-stack, pixel-perfect clone of **Zoom Workplace** web application built to fulfill all requirements of the **SDE Fullstack Assignment**.

---

## 🚀 Live Demo & Repository
- **GitHub Repository**: Public repository ready for submission
- **Evaluation Tech Stack**: Next.js 14 (Frontend SPA) + Python FastAPI (Backend API & WebSockets) + SQLite (Relational Database) + WebRTC (Live Video & Audio Conferencing)

---

## 📋 Evaluation Checklist vs. Assignment Requirements

### 1. Landing Dashboard (Must Have)
- [x] **Clean Professional Zoom UI**: Pixel-perfect replication of Zoom Workplace web & desktop app aesthetics.
- [x] **Top Bar / Navbar**: Persistent search bar, workspace tabs (Home, Team Chat, Meetings), audio/video device pills, settings gear icon, and user profile avatar (`t`).
- [x] **Action Buttons**:
  - [x] **New Meeting** (Orange video camera with instant meeting dropdown)
  - [x] **Join Meeting** (Blue plus button routing to `/join`)
  - [x] **Schedule Meeting** (Zoom calendar icon card routing to `/schedule`)
- [x] **Upcoming Meetings Section**: Tabbed display with live date navigation ("Today", prev/next arrows), meeting cards with time, title, meeting ID, "Start" and copy invite link buttons.
- [x] **Recent Meetings Section**: "Previous" tab displaying past/ended meetings from SQLite.

### 2. Instant Meeting Creation (Must Have)
- [x] **Instant Meeting Creation**: One-click creation via "New Meeting" button.
- [x] **Unique Meeting ID Generation**: Generates 11-digit formatted Zoom meeting IDs (`XXX-XXXX-XXXX`).
- [x] **Shareable Invite Link**: Auto-generates shareable URLs (`http://localhost:3000/join?meetingId=...`).
- [x] **Automatic Redirect**: Instantly navigates host directly into the active meeting room (`/meeting/{id}`).

### 3. Join Meeting (Must Have)
- [x] **Join by Meeting ID or Invite URL**: Prefills from URL query params (`?meetingId=...`) or manual entry.
- [x] **Display Name Input**: Input name before entering room; persists preference to `localStorage`.
- [x] **Validate Meeting Existence**: Queries backend API (`GET /meetings/{id}`); blocks invalid meeting IDs with clear error alerts.
- [x] **Hardware Preview**: Live camera and microphone preview stage with audio level meter, mute/video toggles, and virtual background switcher before joining.

### 4. Schedule Meetings (Must Have)
- [x] **Create Scheduled Meetings**: Dedicated `/schedule` page matching Zoom's scheduling interface.
- [x] **Title & Description**: Custom meeting topic and agenda inputs.
- [x] **Date & Time Picker**: Full native calendar date and time pickers.
- [x] **Duration**: Configurable meeting duration (30 min, 1 hr, etc.).
- [x] **Auto-Generate Meeting Link**: Generates unique meeting ID or optionally uses Personal Meeting ID (PMI).
- [x] **Database Persistence**: Saved to SQLite database with foreign-key-linked settings.
- [x] **Upcoming Meetings Display**: Automatically appears in the Upcoming section on the dashboard and in the Meetings agenda.

### 5. Good to Have (Bonus Features)
- [x] **Responsive Design**: Adapts cleanly across mobile, tablet, and desktop viewports.
- [x] **Live Video Conferencing (WebRTC)**: Multi-peer real-time mesh video, audio streaming, screen sharing, and graceful animated canvas fallbacks.
- [x] **Host Controls**:
  - [x] **Mute All**: One-click mute for all active meeting participants via WebSocket signaling.
  - [x] **Remove Participant**: Host can kick/remove guests from the participants drawer.
  - [x] **End Meeting for All / Leave**: Host can terminate meeting for all or leave meeting active.
- [x] **In-Meeting & Continuous Team Chat**: Real-time meeting chat panel synchronized with persistent team chat channels.

---

## 🗄️ Database Architecture & Schema Deep Dive

> **Assignment Criterion**: *"Database Design: Design your own database schema. This will be evaluated. Well-structured schema with proper relationships."*

The database is built using **SQLite** with strict relational integrity (`PRAGMA foreign_keys = ON`). It models meetings, participants, meeting configurations, and synchronized chat channels.

### Table Relationships:
1. **`meetings`**: Core entity storing meeting lifecycle, unique 11-digit formatted ID, scheduling timestamps, status (`scheduled`, `active`, `ended`), and auto-generated join links.
2. **`participants`**: 1-to-Many relationship with `meetings` (`FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)`). Tracks attendees, host status, entry/exit timestamps (`joined_at`, `left_at`), and real-time mic/camera state.
3. **`meeting_settings`**: 1-to-1 relationship with `meetings` (`FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)`). Encapsulates Zoom meeting policies (waiting room, mute on entry, screen sharing permissions).
4. **`chat_channels`**: Bridges in-meeting chat and Zoom Team Chat, ensuring conversations held during a meeting persist for post-meeting review.
5. **`chat_messages`**: 1-to-Many relationship with `chat_channels` (`FOREIGN KEY (channel_id) REFERENCES chat_channels(id)`). Stores chat messages, timestamps, and sender metadata.

### Automatic Database Seeding (`init_db()`):
On application startup, if the database is unpopulated, `init_db()` automatically seeds realistic Zoom data:
- Today's upcoming meeting: **"test one's Zoom Meeting"**
- Tomorrow's design sync: **"Product Design Review"**
- Future quarter planning: **"Sprint Planning - Q3"**
- Past meetings: **"Team Retrospective"** and **"Client Demo"**
- Static Personal Meeting ID (PMI): **`629-892-4224`**

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Single Page Application (SPA) architecture with React Client Components |
| **Styling** | Vanilla CSS (Zoom Design System) | High-performance CSS matching Zoom Workplace tokens, dark themes, and animations |
| **Icons** | Lucide React | Clean, scalable icons matching Zoom's interface |
| **Backend** | Python FastAPI | High-performance async REST API and WebSocket server |
| **Signaling** | FastAPI WebSockets | Real-time SDP offer/answer exchange, ICE candidate relay, and host signaling |
| **Media Conferencing** | WebRTC API | Multi-peer video/audio mesh, screen capture via `getDisplayMedia`, canvas fallbacks |
| **Database** | SQLite 3 | Relational schema with foreign keys, row factory mapping, and automatic seeding |
| **Containers** | Docker & Docker Compose | Multi-stage production container images for Azure / Cloud deployment |

---

## 💻 Local Development Setup

### 1. Backend (FastAPI + SQLite)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- API Server: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
- Frontend Web App: `http://localhost:3000`

---

## 🐳 Docker Setup

Run both frontend and backend with a single command:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

---

## ☁️ Azure Cloud Deployment

The repository includes:
1. `backend/Dockerfile`: Lightweight Python 3.12 slim container
2. `frontend/Dockerfile`: Multi-stage Next.js standalone build
3. `.github/workflows/azure-deploy.yml`: GitHub Actions CI/CD pipeline
4. `DEPLOYMENT.md`: Complete step-by-step Azure deployment instructions

---

## 📝 Assumptions
- **Authentication**: As specified in the assignment (*"No Login Required: Assume a default user is logged in"*), the application assumes user **`test one`** (`testone@example.com`) is pre-authenticated.
- **Hardware Fallback**: If a physical webcam is unavailable or permissions are denied, an animated Zoom canvas stream automatically activates so multi-user WebRTC calls remain fully functional during testing.