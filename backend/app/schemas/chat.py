"""Pydantic schemas for chat endpoints."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChatMessageResponse(BaseModel):
    """Schema for returning a message."""

    id: uuid.UUID
    role: str
    content: str
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateSessionResponse(BaseModel):
    """Response returned upon starting a new chat session."""

    session_token: str
    conversation_id: uuid.UUID
    lead_id: uuid.UUID
    messages: list[ChatMessageResponse]


class SendMessageRequest(BaseModel):
    """User message payload."""

    content: str = Field(min_length=1, max_length=2000)


class UIAction(BaseModel):
    """Action directive for the frontend widget."""

    type: str  # e.g. "show_upload", "prompt_consent"
    lead_id: uuid.UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class SendMessageResponse(BaseModel):
    """Response returned after processing a user message."""

    message: ChatMessageResponse
    captured: dict[str, Any]
    conversation_status: str  # active, complete, ended
    lead_status: str  # in_conversation, qualified, disqualified, etc.
    ui_actions: list[UIAction] = Field(default_factory=list)


class SessionResumeResponse(BaseModel):
    """Response for resuming an existing chat session."""

    session_token: str
    conversation_id: uuid.UUID
    lead_id: uuid.UUID
    conversation_status: str
    lead_status: str
    messages: list[ChatMessageResponse]
    captured_slots: dict[str, Any]
    ui_actions: list[UIAction] = Field(default_factory=list)
