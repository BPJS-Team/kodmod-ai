"""Pydantic schemas for learning sessions."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SessionStartRequest(BaseModel):
    student_id: uuid.UUID
    mode: str = "tutoring"  # tutoring | quiz | mixed


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None = None
    mode: str
    summary: str | None = None


class VoiceChatRequest(BaseModel):
    """Text fallback for /voice/text - when audio upload is not feasible."""

    student_id: uuid.UUID
    session_id: uuid.UUID | None = None
    text: str
    language: str = "id"


class VoiceChatResponse(BaseModel):
    session_id: uuid.UUID
    intent: str
    response_text: str
    audio_available: bool = False
    latency_ms: int = 0
    metadata: dict = Field(default_factory=dict)
