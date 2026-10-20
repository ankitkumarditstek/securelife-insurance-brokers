"""Lead and LeadStatusHistory model definitions."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.session import Base

# Universal JSON column supporting JSONB on Postgres and JSON on SQLite
JSONType = JSONB().with_variant(JSON(), "sqlite")


class Lead(Base):
    """Core CRM Lead model."""

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), index=True, nullable=True)
    preferred_contact_channel: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    source: Mapped[str] = mapped_column(String(30), default="web_chat", nullable=False)

    # Insurance Interests (stored as JSON array: ["health", "life"])
    insurance_interest: Mapped[list[str] | None] = mapped_column(
        JSONType, default=list, nullable=True
    )
    has_existing_policy: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    current_provider: Mapped[str | None] = mapped_column(String(150), nullable=True)
    age_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    household_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    employment_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    approx_annual_premium: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    premium_currency: Mapped[str] = mapped_column(
        String(3), default="INR", nullable=False
    )
    renewal_timeframe: Mapped[str | None] = mapped_column(String(20), nullable=True)
    main_concern: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Consent
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Lifecycle Status
    status: Mapped[str] = mapped_column(
        String(30), default="new", index=True, nullable=False
    )
    disqualification_reason: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    # Qualification Breakdown
    qualification_score: Mapped[int | None] = mapped_column(
        Integer, index=True, nullable=True
    )
    qualification_tier: Mapped[str | None] = mapped_column(String(10), nullable=True)
    qualification_breakdown: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    needs_human: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Assignment
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )

    # Additional capture buffer
    captured_data: Mapped[dict[str, Any]] = mapped_column(
        JSONType, default=dict, nullable=False
    )

    # Timestamps
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    assignee = relationship("User", back_populates="assigned_leads")
    conversations = relationship(
        "Conversation", back_populates="lead", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "LeadStatusHistory", back_populates="lead", cascade="all, delete-orphan"
    )
    notes = relationship(
        "LeadNote",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="LeadNote.created_at.desc()",
    )
    documents = relationship(
        "Document", back_populates="lead", cascade="all, delete-orphan"
    )
    extractions = relationship(
        "DocumentExtraction", back_populates="lead", cascade="all, delete-orphan"
    )
    analyses = relationship(
        "Analysis", back_populates="lead", cascade="all, delete-orphan"
    )


class LeadNote(Base):
    """Internal notes added by team members for a lead."""

    __tablename__ = "lead_notes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lead = relationship("Lead", back_populates="notes")
    author = relationship("User")


class LeadStatusHistory(Base):
    """Audit log for lead status transitions."""

    __tablename__ = "lead_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    changed_by_type: Mapped[str] = mapped_column(
        String(10), default="system", nullable=False
    )
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lead = relationship("Lead", back_populates="status_history")
