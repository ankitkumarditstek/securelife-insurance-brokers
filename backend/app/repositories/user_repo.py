"""User and LeadNote repositories."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import LeadNote
from app.models.user import User


class UserRepository:
    """Database operations for User entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.db.execute(
            select(User).where(User.id == user_id, User.is_active.is_(True))
        ).scalar_one_or_none()

    def get_by_email(self, email: str) -> User | None:
        return self.db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

    def list_users(self) -> list[User]:
        return list(
            self.db.execute(
                select(User).where(User.is_active.is_(True)).order_by(User.full_name)
            )
            .scalars()
            .all()
        )

    def create(self, **kwargs: Any) -> User:
        user = User(**kwargs)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user


class LeadNoteRepository:
    """Database operations for LeadNote entities."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self, lead_id: uuid.UUID, body: str, author_id: uuid.UUID | None = None
    ) -> LeadNote:
        note = LeadNote(lead_id=lead_id, body=body, author_id=author_id)
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def list_by_lead(self, lead_id: uuid.UUID) -> list[LeadNote]:
        return list(
            self.db.execute(
                select(LeadNote)
                .where(LeadNote.lead_id == lead_id)
                .order_by(LeadNote.created_at.desc())
            )
            .scalars()
            .all()
        )
