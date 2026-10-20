"""CRM Lead and Dashboard endpoints according to FRD-02."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.lead import Lead
from app.models.user import User
from app.repositories.conversation_repo import ConversationRepository
from app.repositories.lead_repo import LeadRepository
from app.schemas.chat import ChatMessageResponse
from app.schemas.crm import (
    DashboardSummaryResponse,
    LeadAssignRequest,
    LeadDetailResponse,
    LeadListItemResponse,
    LeadListPaginatedResponse,
    LeadNoteCreate,
    LeadNoteResponse,
    LeadProfileDetails,
    LeadProfileUpdate,
    LeadQualificationSummary,
    LeadStatusHistoryResponse,
    LeadSummaryCounts,
    PipelineResponse,
    PipelineStageGroup,
    StatusTransitionRequest,
    UserResponse,
)
from app.services.lead_service import LeadService

leads_router = APIRouter(prefix="/leads", tags=["Leads"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _to_detail_response(lead: Lead, counts: dict[str, int]) -> LeadDetailResponse:
    assignee_data = (
        UserResponse.model_validate(lead.assignee) if lead.assignee else None
    )
    return LeadDetailResponse(
        id=lead.id,
        full_name=lead.full_name,
        email=lead.email,
        phone=lead.phone,
        status=lead.status,
        source=lead.source,
        qualification=LeadQualificationSummary(
            score=lead.qualification_score,
            tier=lead.qualification_tier,
            breakdown=lead.qualification_breakdown,
        ),
        profile=LeadProfileDetails(
            insurance_interest=lead.insurance_interest,
            has_existing_policy=lead.has_existing_policy,
            current_provider=lead.current_provider,
            age_range=lead.age_range,
            location=lead.location,
            household_size=lead.household_size,
            employment_status=lead.employment_status,
            approx_annual_premium=lead.approx_annual_premium,
            premium_currency=lead.premium_currency or "INR",
            renewal_timeframe=lead.renewal_timeframe,
            main_concern=lead.main_concern,
            budget_range=lead.budget_range,
        ),
        assigned_to=assignee_data,
        counts=LeadSummaryCounts(**counts),
        summary=lead.summary,
        needs_human=lead.needs_human,
        consent_given=lead.consent_given,
        consent_at=lead.consent_at,
        created_at=lead.created_at,
        last_activity_at=lead.last_activity_at,
    )


def _to_list_item(lead: Lead) -> LeadListItemResponse:
    assignee_data = (
        UserResponse.model_validate(lead.assignee) if lead.assignee else None
    )
    return LeadListItemResponse(
        id=lead.id,
        full_name=lead.full_name,
        email=lead.email,
        phone=lead.phone,
        status=lead.status,
        source=lead.source,
        qualification_score=lead.qualification_score,
        qualification_tier=lead.qualification_tier,
        location=lead.location,
        insurance_interest=lead.insurance_interest,
        assigned_to=assignee_data,
        has_documents=bool(getattr(lead, "documents", None)),
        needs_human=lead.needs_human,
        created_at=lead.created_at,
        last_activity_at=lead.last_activity_at,
    )


# ---------------- Leads Endpoints ----------------
@leads_router.get("", response_model=LeadListPaginatedResponse)
def list_leads(
    status: Annotated[list[str] | None, Query()] = None,
    tier: str | None = None,
    q: str | None = None,
    assigned_to: uuid.UUID | None = None,
    has_documents: bool | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    sort: str = "-created_at",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> LeadListPaginatedResponse:
    """List leads with multi-status filters, search, tier, and pagination."""
    repo = LeadRepository(db)
    items, total = repo.list_leads(
        statuses=status,
        tier=tier,
        q=q,
        assigned_to=assigned_to,
        has_documents=has_documents,
        created_from=created_from,
        created_to=created_to,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return LeadListPaginatedResponse(
        items=[_to_list_item(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@leads_router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead_detail(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> LeadDetailResponse:
    """Get full lead detail with embedded counts and profile."""
    repo = LeadRepository(db)
    lead = repo.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    counts = repo.get_summary_counts(lead_id)
    return _to_detail_response(lead, counts)


@leads_router.patch("/{lead_id}", response_model=LeadDetailResponse)
def update_lead_profile(
    lead_id: uuid.UUID,
    data: LeadProfileUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role("agent", "broker", "admin")),
) -> LeadDetailResponse:
    """Edit lead profile fields."""
    service = LeadService(db)
    lead = service.update_profile(lead_id, data.model_dump(exclude_unset=True))
    repo = LeadRepository(db)
    counts = repo.get_summary_counts(lead.id)
    return _to_detail_response(lead, counts)


@leads_router.post("/{lead_id}/status", response_model=LeadDetailResponse)
def transition_status(
    lead_id: uuid.UUID,
    req: StatusTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "broker", "admin")),
) -> LeadDetailResponse:
    """Transition lead lifecycle status with audit history."""
    service = LeadService(db)
    lead, _ = service.transition(
        lead_id=lead_id,
        to_status=req.to_status,
        actor="user",
        reason=req.reason,
        user_id=current_user.id,
    )
    repo = LeadRepository(db)
    counts = repo.get_summary_counts(lead.id)
    return _to_detail_response(lead, counts)


@leads_router.post("/{lead_id}/assign", response_model=LeadDetailResponse)
def assign_lead(
    lead_id: uuid.UUID,
    req: LeadAssignRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role("broker", "admin")),
) -> LeadDetailResponse:
    """Assign lead to a broker."""
    service = LeadService(db)
    lead = service.assign_lead(lead_id, req.user_id)
    repo = LeadRepository(db)
    counts = repo.get_summary_counts(lead.id)
    return _to_detail_response(lead, counts)


@leads_router.get("/{lead_id}/conversation", response_model=list[ChatMessageResponse])
def get_lead_conversation(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[ChatMessageResponse]:
    """Fetch complete chat conversation transcript ordered ASC."""
    conv_repo = ConversationRepository(db)
    conv = conv_repo.get_by_lead_id(lead_id)
    if not conv:
        return []
    messages = conv_repo.get_messages(conv.id)
    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at,
            metadata=m.message_metadata,
        )
        for m in messages
    ]


@leads_router.get("/{lead_id}/history", response_model=list[LeadStatusHistoryResponse])
def get_lead_history(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[LeadStatusHistoryResponse]:
    """Retrieve full audit history of status changes for a lead."""
    service = LeadService(db)
    history = service.get_status_history(lead_id)
    return [LeadStatusHistoryResponse.model_validate(h) for h in history]


@leads_router.get("/{lead_id}/notes", response_model=list[LeadNoteResponse])
def list_lead_notes(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[LeadNoteResponse]:
    """List notes for a lead."""
    service = LeadService(db)
    notes = service.list_notes(lead_id)
    return [LeadNoteResponse.model_validate(n) for n in notes]


@leads_router.post(
    "/{lead_id}/notes",
    response_model=LeadNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_lead_note(
    lead_id: uuid.UUID,
    req: LeadNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadNoteResponse:
    """Add internal broker note to a lead."""
    service = LeadService(db)
    note = service.add_note(lead_id, req.body, author_id=current_user.id)
    return LeadNoteResponse.model_validate(note)


@leads_router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role("admin")),
) -> None:
    """Soft delete a lead."""
    service = LeadService(db)
    service.soft_delete(lead_id)


# ---------------- Dashboard Endpoints ----------------
@dashboard_router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> DashboardSummaryResponse:
    """Get aggregated lead counts and key performance indicators."""
    repo = LeadRepository(db)
    data = repo.get_dashboard_summary()
    return DashboardSummaryResponse(**data)


@dashboard_router.get("/pipeline", response_model=PipelineResponse)
def get_dashboard_pipeline(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> PipelineResponse:
    """Return leads grouped by lifecycle stage for Kanban visualization."""
    repo = LeadRepository(db)
    stages = [
        "new",
        "in_conversation",
        "qualified",
        "documents_pending",
        "documents_processing",
        "under_review",
        "analysis_complete",
        "closed_won",
    ]
    groups = []
    for stage in stages:
        leads, total = repo.list_leads(statuses=[stage], page_size=50)
        groups.append(
            PipelineStageGroup(
                stage=stage,
                count=total,
                leads=[_to_list_item(lead_entry) for lead_entry in leads],
            )
        )
    return PipelineResponse(stages=groups)
