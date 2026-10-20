"""Repository for Conversation and Message entities."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, Message


class ConversationRepository:
    """Database operations for chat conversations and messages."""

    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        lead_id: uuid.UUID,
        session_token: str,
        expiry_days: int = 7,
        channel: str = "web_chat",
    ) -> Conversation:
        now = datetime.now(UTC)
        conversation = Conversation(
            lead_id=lead_id,
            session_token=session_token,
            channel=channel,
            status="active",
            state={"slots": {}, "declined": [], "attempts": {}},
            turn_count=0,
            started_at=now,
            expires_at=now + timedelta(days=expiry_days),
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_by_session_token(self, session_token: str) -> Conversation | None:
        return self.db.execute(
            select(Conversation).where(Conversation.session_token == session_token)
        ).scalar_one_or_none()

    def get_by_id(self, conversation_id: uuid.UUID) -> Conversation | None:
        return self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        ).scalar_one_or_none()

    def get_by_lead_id(self, lead_id: uuid.UUID) -> Conversation | None:
        return (
            self.db.execute(
                select(Conversation)
                .where(Conversation.lead_id == lead_id)
                .order_by(Conversation.started_at.desc())
            )
            .scalars()
            .first()
        )

    def update_conversation(
        self, conversation: Conversation, **kwargs: Any
    ) -> Conversation:
        for k, v in kwargs.items():
            if hasattr(conversation, k):
                setattr(conversation, k, v)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def add_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_metadata=metadata or {},
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_messages(self, conversation_id: uuid.UUID) -> list[Message]:
        return list(
            self.db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at)
            )
            .scalars()
            .all()
        )
