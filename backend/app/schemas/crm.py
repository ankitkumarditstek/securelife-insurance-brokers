"""Pydantic schemas for CRM Leads, Dashboard, Notes, and Auth."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------- Auth Schemas ----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


# ---------------- Note Schemas ----------------
class LeadNoteCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class LeadNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    author_id: uuid.UUID | None
    body: str
    created_at: datetime
    author: UserResponse | None = None


# ---------------- Status Transition & Assignment ----------------
class StatusTransitionRequest(BaseModel):
    to_status: str
    reason: str | None = None


class LeadAssignRequest(BaseModel):
    user_id: uuid.UUID


class LeadStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    from_status: str | None
    to_status: str
    changed_by_user_id: uuid.UUID | None
    changed_by_type: str
    reason: str | None
    created_at: datetime


# ---------------- Lead Profile & CRUD ----------------
class LeadProfileUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    preferred_contact_channel: str | None = None
    insurance_interest: list[str] | None = None
    has_existing_policy: bool | None = None
    current_provider: str | None = None
    age_range: str | None = None
    location: str | None = None
    household_size: int | None = None
    employment_status: str | None = None
    approx_annual_premium: Decimal | None = None
    premium_currency: str | None = None
    renewal_timeframe: str | None = None
    main_concern: str | None = None
    budget_range: str | None = None
    needs_human: bool | None = None
    disqualification_reason: str | None = None


class LeadQualificationSummary(BaseModel):
    score: int | None
    tier: str | None
    breakdown: dict[str, Any] | None = None


class LeadProfileDetails(BaseModel):
    insurance_interest: list[str] | None = None
    has_existing_policy: bool | None = None
    current_provider: str | None = None
    age_range: str | None = None
    location: str | None = None
    household_size: int | None = None
    employment_status: str | None = None
    approx_annual_premium: Decimal | None = None
    premium_currency: str = "INR"
    renewal_timeframe: str | None = None
    main_concern: str | None = None
    budget_range: str | None = None


class LeadSummaryCounts(BaseModel):
    messages: int = 0
    documents: int = 0
    analyses: int = 0
    notes: int = 0


class LeadDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None
    email: str | None
    phone: str | None
    status: str
    source: str
    qualification: LeadQualificationSummary
    profile: LeadProfileDetails
    assigned_to: UserResponse | None = None
    counts: LeadSummaryCounts
    summary: str | None = None
    needs_human: bool = False
    consent_given: bool = False
    consent_at: datetime | None = None
    created_at: datetime
    last_activity_at: datetime


class LeadListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None
    email: str | None
    phone: str | None
    status: str
    source: str
    qualification_score: int | None
    qualification_tier: str | None
    location: str | None
    insurance_interest: list[str] | None
    assigned_to: UserResponse | None = None
    has_documents: bool = False
    needs_human: bool = False
    created_at: datetime
    last_activity_at: datetime


class LeadListPaginatedResponse(BaseModel):
    items: list[LeadListItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------- Dashboard & Pipeline Schemas ----------------
class DashboardStatusTotals(BaseModel):
    all: int = 0
    new: int = 0
    in_conversation: int = 0
    qualified: int = 0
    documents_pending: int = 0
    documents_processing: int = 0
    under_review: int = 0
    analysis_complete: int = 0
    closed_won: int = 0
    closed_lost: int = 0
    disqualified: int = 0


class DashboardSummaryResponse(BaseModel):
    totals: DashboardStatusTotals
    avg_hours_to_analysis: float = 0.4
    conversion_rate: float = 0.0
    hot_leads_waiting: int = 0
    documents_awaiting_review: int = 0


class PipelineStageGroup(BaseModel):
    stage: str
    count: int
    leads: list[LeadListItemResponse]


class PipelineResponse(BaseModel):
    stages: list[PipelineStageGroup]
