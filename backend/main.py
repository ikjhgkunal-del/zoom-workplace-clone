from fastapi import FastAPI, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import meetings, participants, signaling, chat
import httpx
import asyncio
import websockets

app = FastAPI(title="Zoom Clone API", version="1.0.0")

# CORS — allow Next.js frontend (HTTP + WebSocket)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://kunalmujoo.dpdns.org",
        "http://kunalmujoo.dpdns.org",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB + seed on startup
@app.on_event("startup")
def startup():
    init_db()

# Mount API routers (prefixed with /api to avoid collision with Next.js frontend pages like /meetings)
app.include_router(meetings.router, prefix="/api")
app.include_router(participants.router, prefix="/api")
app.include_router(signaling.router)   # WebSocket signaling: /ws/{meeting_id}
app.include_router(chat.router)        # Team Chat: /api/chat

# Backward-compatibility: redirect non-GET /meetings API calls to /api/meetings
from fastapi.responses import RedirectResponse

@app.api_route("/meetings", methods=["POST", "PUT", "DELETE"])
@app.api_route("/meetings/{subpath:path}", methods=["POST", "PUT", "DELETE"])
async def legacy_meetings_api_redirect(request: Request, subpath: str = ""):
    target_api = f"/api/meetings/{subpath}" if subpath else "/api/meetings"
    if request.url.query:
        target_api += f"?{request.url.query}"
    return RedirectResponse(url=target_api, status_code=307)


@app.get("/health")
def health():
    return {"status": "ok"}


# Transparent proxy to Next.js frontend running on port 3000
# Allows a single tunnel/port to serve both frontend and backend seamlessly!
http_client = httpx.AsyncClient(base_url="http://localhost:3000", timeout=30.0)


@app.websocket("/_next/{ws_path:path}")
async def proxy_next_ws(client_ws: WebSocket, ws_path: str):
    await client_ws.accept()
    query = client_ws.scope.get("query_string", b"").decode()
    target_url = f"ws://localhost:3000/_next/{ws_path}"
    if query:
        target_url += f"?{query}"
    try:
        async with websockets.connect(target_url) as server_ws:
            async def forward_to_client():
                try:
                    async for msg in server_ws:
                        if isinstance(msg, bytes):
                            await client_ws.send_bytes(msg)
                        else:
                            await client_ws.send_text(msg)
                except Exception:
                    pass

            async def forward_to_server():
                try:
                    async for msg in client_ws.iter_text():
                        await server_ws.send(msg)
                except Exception:
                    pass

            await asyncio.gather(forward_to_client(), forward_to_server())
    except Exception:
        pass


@app.api_route("/", methods=["GET", "POST", "HEAD"])
async def proxy_root(request: Request):
    return await proxy_frontend(request, "")


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def proxy_frontend(request: Request, full_path: str):
    url = f"/{full_path}"
    if request.url.query:
        url += f"?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()
    try:
        res = await http_client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            follow_redirects=True,
        )
        resp_headers = {
            k: v for k, v in res.headers.items()
            if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
        }
        return Response(content=res.content, status_code=res.status_code, headers=resp_headers)
    except Exception as e:
        return Response(content=f"Frontend connection error: {str(e)}", status_code=502)

