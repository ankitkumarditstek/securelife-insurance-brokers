"""Lead service managing status lifecycle transitions, business rules, notes, and assignment."""

import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadNote, LeadStatusHistory
from app.repositories.lead_repo import LeadRepository
from app.repositories.user_repo import LeadNoteRepository, UserRepository

# Enforced transition map as defined in PRD §5 and FRD-02 §6
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "new": {"in_conversation", "disqualified"},
    "in_conversation": {"qualified", "disqualified", "in_conversation"},
    "qualified": {"documents_pending", "disqualified", "closed_lost", "qualified"},
    "documents_pending": {"documents_processing", "closed_lost", "documents_pending"},
    "documents_processing": {
        "under_review",
        "documents_pending",
        "documents_processing",
    },
    "under_review": {"analysis_complete", "documents_pending", "under_review"},
    "analysis_complete": {
        "closed_won",
        "closed_lost",
        "under_review",
        "analysis_complete",
    },
    "disqualified": {"qualified"},  # manual override by broker
    "closed_won": set(),
    "closed_lost": set(),
}


class LeadService:
    """Service handling lead mutations and status governance."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = LeadRepository(db)
        self.user_repo = UserRepository(db)
        self.note_repo = LeadNoteRepository(db)

    def transition(
        self,
        lead_id: uuid.UUID,
        to_status: str,
        actor: str = "system",
        reason: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> tuple[Lead, LeadStatusHistory | None]:
        """Enforce strict status lifecycle transition rules and record audit history."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {"code": "LEAD_NOT_FOUND", "message": "Lead not found"}
                },
            )

        current = lead.status
        if current == to_status:
            return lead, None

        allowed = ALLOWED_TRANSITIONS.get(current, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "code": "INVALID_STATUS_TRANSITION",
                        "message": (
                            f"Cannot transition lead status from '{current}' "
                            f"to '{to_status}'"
                        ),
                    }
                },
            )

        # Integrity rule: Must have email or phone before status can become qualified
        if to_status == "qualified" and not (lead.email or lead.phone):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "MISSING_CONTACT_FOR_QUALIFICATION",
                        "message": (
                            "Lead must have at least email or phone "
                            "before being qualified."
                        ),
                    }
                },
            )

        # Update lead
        self.repo.update(lead, status=to_status)

        # Record history
        history = self.repo.record_status_history(
            lead_id=lead.id,
            from_status=current,
            to_status=to_status,
            reason=reason,
            changed_by_type=actor,
            changed_by_user_id=user_id,
        )

        return lead, history

    def assign_lead(self, lead_id: uuid.UUID, user_id: uuid.UUID) -> Lead:
        """Assign lead to a team broker or agent."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return self.repo.update(lead, assigned_to=user.id)

    def add_note(
        self, lead_id: uuid.UUID, body: str, author_id: uuid.UUID | None = None
    ) -> LeadNote:
        """Add note to lead."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return self.note_repo.create(lead_id=lead.id, body=body, author_id=author_id)

    def list_notes(self, lead_id: uuid.UUID) -> list[LeadNote]:
        """Fetch all notes for a lead."""
        return self.note_repo.list_by_lead(lead_id)

    def get_status_history(self, lead_id: uuid.UUID) -> list[LeadStatusHistory]:
        """Retrieve audit log of status transitions."""
        return self.repo.get_status_history(lead_id)

    def soft_delete(self, lead_id: uuid.UUID) -> None:
        """Soft delete a lead."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        self.repo.soft_delete(lead)

    def update_profile(self, lead_id: uuid.UUID, data: dict[str, Any]) -> Lead:
        """Edit lead profile fields."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return self.repo.update(
            lead, **{k: v for k, v in data.items() if v is not None}
        )

    def update_captured_slots(self, lead_id: uuid.UUID, slots: dict[str, Any]) -> Lead:
        """Update structured profile columns and extra slots on the lead record."""
        lead = self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        updates: dict[str, Any] = {}
        for col in [
            "full_name",
            "email",
            "phone",
            "preferred_contact_channel",
            "has_existing_policy",
            "current_provider",
            "age_range",
            "location",
            "household_size",
            "employment_status",
            "approx_annual_premium",
            "premium_currency",
            "renewal_timeframe",
            "main_concern",
            "budget_range",
            "consent_given",
        ]:
            if col in slots and slots[col] is not None:
                updates[col] = slots[col]

        if "insurance_interest" in slots:
            interest = slots["insurance_interest"]
            updates["insurance_interest"] = (
                interest if isinstance(interest, list) else [interest]
            )

        captured_data = dict(lead.captured_data or {})
        for k, v in slots.items():
            if k not in updates:
                captured_data[k] = v
        updates["captured_data"] = captured_data

        return self.repo.update(lead, **updates)
