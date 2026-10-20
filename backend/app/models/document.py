"""Document, Page, and Extraction model definitions according to FRD-02."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.session import Base

JSONType = JSONB().with_variant(JSON(), "sqlite")


class Document(Base):
    """Uploaded policy or statement document."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    doc_type: Mapped[str] = mapped_column(
        String(30), default="policy", nullable=False
    )  # policy, claim_history, renewal_notice, other, unknown
    is_scanned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processing_status: Mapped[str] = mapped_column(
        String(20), default="uploaded", nullable=False
    )  # uploaded, queued, processing, extracted, needs_review, verified, failed
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    processing_finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(20), default="lead", nullable=False
    )  # lead / user
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lead = relationship("Lead", back_populates="documents")
    pages = relationship(
        "DocumentPage",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentPage.page_number",
    )
    extraction = relationship(
        "DocumentExtraction",
        back_populates="document",
        uselist=False,
        cascade="all, delete-orphan",
    )


class DocumentPage(Base):
    """Individual extracted page of a document."""

    __tablename__ = "document_pages"
    __table_args__ = (
        UniqueConstraint("document_id", "page_number", name="uq_doc_page"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_method: Mapped[str] = mapped_column(
        String(15), default="text_layer", nullable=False
    )  # text_layer, ocr
    ocr_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="pages")


class DocumentExtraction(Base):
    """Structured extraction result for a document."""

    __tablename__ = "document_extractions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("documents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    schema_version: Mapped[str] = mapped_column(
        String(10), default="1.0", nullable=False
    )
    data: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)
    field_confidence: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    field_evidence: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    missing_fields: Mapped[list[str] | None] = mapped_column(JSONType, nullable=True)
    overall_confidence: Mapped[float | None] = mapped_column(
        Numeric(4, 3), nullable=True
    )
    review_status: Mapped[str] = mapped_column(
        String(15), default="pending", nullable=False
    )  # pending, verified, corrected
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    corrections: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONType, nullable=True
    )
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
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
    document = relationship("Document", back_populates="extraction")
    lead = relationship("Lead", back_populates="extractions")
