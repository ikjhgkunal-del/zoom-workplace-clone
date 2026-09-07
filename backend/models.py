from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = 60
    passcode: Optional[str] = ""
    host_name: Optional[str] = "test one"
    meeting_id: Optional[str] = None
    waiting_room: Optional[bool] = False
    mute_on_entry: Optional[bool] = False
    allow_screen_share: Optional[bool] = True



class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    duration: Optional[int] = None
    passcode: Optional[str] = None



class MeetingResponse(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: str
    host_name: str
    host_email: str
    start_time: Optional[str]
    end_time: Optional[str]
    duration: int
    invite_link: str
    is_instant: bool
    status: str
    passcode: str
    created_at: str


class ParticipantJoin(BaseModel):
    display_name: str
    is_host: Optional[bool] = False


class ParticipantResponse(BaseModel):
    id: int
    meeting_id: str
    display_name: str
    is_host: bool
    joined_at: str
    left_at: Optional[str]
    is_muted: bool
    video_on: bool


class StatusUpdate(BaseModel):
    status: str  # scheduled | active | ended
