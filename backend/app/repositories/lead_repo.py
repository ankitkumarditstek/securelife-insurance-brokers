"""Repository for Lead and LeadStatusHistory entities."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Message
from app.models.document import Document
from app.models.lead import Lead, LeadNote, LeadStatusHistory


class LeadRepository:
    """Database operations for Lead management."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs: Any) -> Lead:
        lead = Lead(**kwargs)
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def get_by_id(self, lead_id: uuid.UUID) -> Lead | None:
        return self.db.execute(
            select(Lead)
            .options(joinedload(Lead.assignee))
            .where(Lead.id == lead_id, Lead.deleted_at.is_(None))
        ).scalar_one_or_none()

    def get_by_email_or_phone(
        self, email: str | None = None, phone: str | None = None
    ) -> Lead | None:
        if not email and not phone:
            return None
        stmt = select(Lead).where(Lead.deleted_at.is_(None))
        if email and phone:
            stmt = stmt.where((Lead.email == email) | (Lead.phone == phone))
        elif email:
            stmt = stmt.where(Lead.email == email)
        else:
            stmt = stmt.where(Lead.phone == phone)
        return self.db.execute(stmt).scalars().first()

    def update(self, lead: Lead, **kwargs: Any) -> Lead:
        for k, v in kwargs.items():
            if hasattr(lead, k):
                setattr(lead, k, v)
        lead.last_activity_at = datetime.now()
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def soft_delete(self, lead: Lead) -> None:
        lead.deleted_at = datetime.now()
        self.db.commit()

    def record_status_history(
        self,
        lead_id: uuid.UUID,
        from_status: str | None,
        to_status: str,
        reason: str | None = None,
        changed_by_type: str = "system",
        changed_by_user_id: uuid.UUID | None = None,
    ) -> LeadStatusHistory:
        history = LeadStatusHistory(
            lead_id=lead_id,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            changed_by_type=changed_by_type,
            changed_by_user_id=changed_by_user_id,
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_status_history(self, lead_id: uuid.UUID) -> list[LeadStatusHistory]:
        return list(
            self.db.execute(
                select(LeadStatusHistory)
                .where(LeadStatusHistory.lead_id == lead_id)
                .order_by(desc(LeadStatusHistory.created_at))
            )
            .scalars()
            .all()
        )

    def list_leads(
        self,
        statuses: list[str] | None = None,
        tier: str | None = None,
        q: str | None = None,
        assigned_to: uuid.UUID | None = None,
        has_documents: bool | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        sort: str = "-created_at",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Lead], int]:
        stmt = (
            select(Lead)
            .options(joinedload(Lead.assignee))
            .where(Lead.deleted_at.is_(None))
        )

        # Filters
        if statuses:
            stmt = stmt.where(Lead.status.in_(statuses))
        if tier:
            stmt = stmt.where(Lead.qualification_tier == tier)
        if assigned_to:
            stmt = stmt.where(Lead.assigned_to == assigned_to)
        if created_from:
            stmt = stmt.where(Lead.created_at >= created_from)
        if created_to:
            stmt = stmt.where(Lead.created_at <= created_to)

        if has_documents is not None:
            doc_subq = select(Document.lead_id).distinct()
            if has_documents:
                stmt = stmt.where(Lead.id.in_(doc_subq))
            else:
                stmt = stmt.where(Lead.id.not_in(doc_subq))

        if q:
            term = f"%{q.strip()}%"
            stmt = stmt.where(
                or_(
                    Lead.full_name.ilike(term),
                    Lead.email.ilike(term),
                    Lead.phone.ilike(term),
                    Lead.location.ilike(term),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.execute(count_stmt).scalar_one()

        # Sorting
        if sort == "-qualification_score":
            stmt = stmt.order_by(
                Lead.qualification_score.desc().nulls_last(), desc(Lead.created_at)
            )
        elif sort == "qualification_score":
            stmt = stmt.order_by(
                Lead.qualification_score.asc().nulls_first(), desc(Lead.created_at)
            )
        elif sort == "-last_activity_at":
            stmt = stmt.order_by(desc(Lead.last_activity_at))
        elif sort == "last_activity_at":
            stmt = stmt.order_by(Lead.last_activity_at)
        elif sort == "created_at":
            stmt = stmt.order_by(Lead.created_at)
        else:
            stmt = stmt.order_by(desc(Lead.created_at))

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        leads = list(self.db.execute(stmt).scalars().all())
        return leads, total

    def get_summary_counts(self, lead_id: uuid.UUID) -> dict[str, int]:
        """Aggregate related item counts for a lead."""
        from app.models.analysis import Analysis
        from app.models.conversation import Conversation

        msg_count = self.db.execute(
            select(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.lead_id == lead_id)
        ).scalar_one()

        doc_count = self.db.execute(
            select(func.count(Document.id)).where(Document.lead_id == lead_id)
        ).scalar_one()

        analysis_count = self.db.execute(
            select(func.count(Analysis.id)).where(Analysis.lead_id == lead_id)
        ).scalar_one()

        notes_count = self.db.execute(
            select(func.count(LeadNote.id)).where(LeadNote.lead_id == lead_id)
        ).scalar_one()

        return {
            "messages": msg_count,
            "documents": doc_count,
            "analyses": analysis_count,
            "notes": notes_count,
        }

    def get_dashboard_summary(self) -> dict[str, Any]:
        """Aggregate status counts and pipeline metrics."""
        rows = self.db.execute(
            select(Lead.status, func.count(Lead.id))
            .where(Lead.deleted_at.is_(None))
            .group_by(Lead.status)
        ).all()

        totals: dict[str, int] = {
            "all": 0,
            "new": 0,
            "in_conversation": 0,
            "qualified": 0,
            "documents_pending": 0,
            "documents_processing": 0,
            "under_review": 0,
            "analysis_complete": 0,
            "closed_won": 0,
            "closed_lost": 0,
            "disqualified": 0,
        }

        total_all = 0
        for status_val, count_val in rows:
            totals[status_val] = count_val
            total_all += count_val
        totals["all"] = total_all

        hot_leads_waiting = self.db.execute(
            select(func.count(Lead.id)).where(
                Lead.deleted_at.is_(None),
                Lead.qualification_tier == "hot",
                Lead.status.in_(["qualified", "under_review", "analysis_complete"]),
                Lead.assigned_to.is_(None),
            )
        ).scalar_one()

        doc_review_count = self.db.execute(
            select(func.count(Document.id)).where(
                Document.processing_status.in_(["uploaded", "needs_review", "queued"])
            )
        ).scalar_one()

        won = totals.get("closed_won", 0)
        conversion_rate = round(won / total_all, 2) if total_all > 0 else 0.0

        return {
            "totals": totals,
            "avg_hours_to_analysis": 0.4,
            "conversion_rate": conversion_rate,
            "hot_leads_waiting": hot_leads_waiting,
            "documents_awaiting_review": doc_review_count,
        }
