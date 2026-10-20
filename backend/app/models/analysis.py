"""Analysis and AnalysisFinding model definitions according to FRD-02."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.session import Base

JSONType = JSONB().with_variant(JSON(), "sqlite")


class Analysis(Base):
    """Consolidated policy analysis and recommendation."""

    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(
        String(15), default="queued", nullable=False
    )  # queued, running, complete, failed
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    coverage_summary: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    estimated_savings: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    risk_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)  # 0-100
    recommended_action: Mapped[str | None] = mapped_column(String(30), nullable=True)
    recommendation_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    input_snapshot: Mapped[dict[str, Any] | None] = mapped_column(
        JSONType, nullable=True
    )
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lead = relationship("Lead", back_populates="analyses")
    findings = relationship(
        "AnalysisFinding",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="AnalysisFinding.sort_order",
    )


class AnalysisFinding(Base):
    """Individual gap, saving, risk, or opportunity finding."""

    __tablename__ = "analysis_findings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    finding_type: Mapped[str] = mapped_column(
        String(15), nullable=False
    )  # gap, saving, risk, opportunity
    severity: Mapped[str] = mapped_column(
        String(10), default="medium", nullable=False
    )  # low, medium, high, critical
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONType, nullable=True
    )
    estimated_value: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    analysis = relationship("Analysis", back_populates="findings")
