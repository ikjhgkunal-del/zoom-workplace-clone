from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import meetings, participants

app = FastAPI(title="Zoom Clone API", version="1.0.0")

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB + seed on startup
@app.on_event("startup")
def startup():
    init_db()

# Mount routers
app.include_router(meetings.router)
app.include_router(participants.router)


@app.get("/")
def root():
    return {"message": "Zoom Clone API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
