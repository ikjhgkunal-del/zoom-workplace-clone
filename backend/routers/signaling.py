"""
WebSocket Signaling Server for WebRTC
Manages rooms and relays SDP offers/answers and ICE candidates between peers.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# rooms[meeting_id][user_id] = {"ws": WebSocket, "display_name": str, "is_muted": bool, "video_off": bool}
rooms: dict[str, dict[str, dict]] = {}


async def _safe_send(ws: WebSocket, data: dict):
    """Send JSON to a WebSocket, ignoring errors if connection is closed."""
    try:
        await ws.send_text(json.dumps(data))
    except Exception:
        pass


async def broadcast(meeting_id: str, message: dict, exclude: str = None):
    """Send a message to all peers in a room, optionally excluding one."""
    if meeting_id not in rooms:
        return
    dead = []
    for uid, peer in list(rooms[meeting_id].items()):
        if uid == exclude:
            continue
        try:
            await peer["ws"].send_text(json.dumps(message))
        except Exception:
            dead.append(uid)
    for uid in dead:
        rooms[meeting_id].pop(uid, None)


async def send_to(meeting_id: str, target_id: str, message: dict):
    """Send a message to a specific peer."""
    peer = (rooms.get(meeting_id) or {}).get(target_id)
    if peer:
        await _safe_send(peer["ws"], message)


@router.websocket("/ws/{meeting_id}")
async def signaling_endpoint(websocket: WebSocket, meeting_id: str):
    await websocket.accept()

    # Read identity from query params
    user_id = websocket.query_params.get("user_id", "anon")
    display_name = websocket.query_params.get("display_name", "Anonymous")

    # Register in room
    if meeting_id not in rooms:
        rooms[meeting_id] = {}

    rooms[meeting_id][user_id] = {
        "ws": websocket,
        "display_name": display_name,
        "is_muted": False,
        "video_off": False,
    }
    logger.info(f"[{meeting_id}] {display_name} ({user_id}) joined. Room size: {len(rooms[meeting_id])}")

    # Tell newcomer about existing peers
    existing = [
        {
            "user_id": uid,
            "display_name": info["display_name"],
            "is_muted": info["is_muted"],
            "video_off": info["video_off"],
        }
        for uid, info in rooms[meeting_id].items()
        if uid != user_id
    ]
    await _safe_send(websocket, {"type": "peers", "peers": existing})

    # Announce newcomer to existing peers
    await broadcast(meeting_id, {
        "type": "peer-joined",
        "peer": {
            "user_id": user_id,
            "display_name": display_name,
            "is_muted": False,
            "video_off": False,
        },
    }, exclude=user_id)

    try:
        async for raw in websocket.iter_text():
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")
            target = data.get("target")

            # --- Peer-to-peer relay (offer / answer / ice) ---
            if msg_type in ("offer", "answer", "ice"):
                if target:
                    await send_to(meeting_id, target, {**data, "from": user_id})

            # --- Broadcast media state changes ---
            elif msg_type == "mute":
                muted = bool(data.get("muted"))
                if meeting_id in rooms and user_id in rooms[meeting_id]:
                    rooms[meeting_id][user_id]["is_muted"] = muted
                await broadcast(meeting_id, {
                    "type": "peer-muted",
                    "user_id": user_id,
                    "muted": muted,
                }, exclude=user_id)

            elif msg_type == "video":
                video_off = bool(data.get("videoOff"))
                if meeting_id in rooms and user_id in rooms[meeting_id]:
                    rooms[meeting_id][user_id]["video_off"] = video_off
                await broadcast(meeting_id, {
                    "type": "peer-video",
                    "user_id": user_id,
                    "videoOff": video_off,
                }, exclude=user_id)

            # --- Chat ---
            elif msg_type == "chat":
                await broadcast(meeting_id, {
                    "type": "chat",
                    "from": user_id,
                    "display_name": display_name,
                    "text": data.get("text", ""),
                }, exclude=user_id)

            # --- Host controls: Mute All & Kick/Remove Participant ---
            elif msg_type == "mute-all":
                await broadcast(meeting_id, {"type": "host-mute-all"}, exclude=user_id)

            elif msg_type == "kick":
                if target:
                    await send_to(meeting_id, target, {"type": "kicked", "reason": data.get("reason", "Removed by host")})

            # --- Explicit leave ---
            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up
        if meeting_id in rooms:
            rooms[meeting_id].pop(user_id, None)
            if not rooms[meeting_id]:
                del rooms[meeting_id]

        await broadcast(meeting_id, {"type": "peer-left", "user_id": user_id})
        logger.info(f"[{meeting_id}] {display_name} ({user_id}) left.")
