"""API Router for Conversational Lead Capture (FRD-01 §5)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import (
    CreateSessionResponse,
    SendMessageRequest,
    SendMessageResponse,
    SessionResumeResponse,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead capture chat session",
)
def create_chat_session(
    db: DbSession,
) -> CreateSessionResponse:
    """Initialize a new conversation and return session greeting."""
    service = ChatService(db)
    return service.start_session()


@router.post(
    "/sessions/{session_token}/messages",
    response_model=SendMessageResponse,
    summary="Send a message in the chat session",
)
def send_chat_message(
    session_token: str,
    payload: SendMessageRequest,
    db: DbSession,
) -> SendMessageResponse:
    """Send user input and receive structured response extracted by LangGraph."""
    service = ChatService(db)
    return service.process_message(
        session_token=session_token, user_content=payload.content
    )


@router.get(
    "/sessions/{session_token}",
    response_model=SessionResumeResponse,
    summary="Resume an existing chat session",
)
def get_chat_session(
    session_token: str,
    db: DbSession,
) -> SessionResumeResponse:
    """Fetch previous transcript and currently captured slots for visitors."""
    service = ChatService(db)
    return service.resume_session(session_token=session_token)


@router.post(
    "/sessions/{session_token}/end",
    summary="End chat session",
)
def end_chat_session(
    session_token: str,
    db: DbSession,
) -> dict[str, str]:
    """Explicitly mark session as closed."""
    service = ChatService(db)
    return service.end_session(session_token=session_token)
