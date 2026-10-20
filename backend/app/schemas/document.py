"""Document processing and structured extraction schemas according to FRD-03."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Extraction Result Nested Models (§5)
# ---------------------------------------------------------------------------


class ProviderInfo(BaseModel):
    """Insurance company / provider information."""

    name: str = ""
    address: str | None = None
    contact: str | None = None
    irdai_or_license_no: str | None = None


class PolicyHolder(BaseModel):
    """Primary policy holder details."""

    name: str | None = None
    dob: str | None = None
    address: str | None = None


class InsuredMember(BaseModel):
    """Insured family member or individual."""

    name: str | None = None
    relationship: str | None = None
    age: int | None = None


class Nominee(BaseModel):
    """Nominee details."""

    name: str | None = None
    relationship: str | None = None


class PolicyDetails(BaseModel):
    """Core policy metadata."""

    policy_number: str | None = None
    policy_type: str = "health"  # health, life, motor, home, travel, business, other
    plan_name: str | None = None
    status: str = "active"  # active, lapsed, unknown
    start_date: str | None = None
    end_date: str | None = None
    renewal_date: str | None = None
    policy_holder: PolicyHolder = Field(default_factory=PolicyHolder)
    insured_members: list[InsuredMember] = Field(default_factory=list)
    nominees: list[Nominee] = Field(default_factory=list)


class SumInsured(BaseModel):
    """Sum insured amount and currency."""

    amount: float | None = None
    currency: str | None = "INR"


class CoverageItem(BaseModel):
    """Specific coverage benefit."""

    name: str
    limit: float | None = None
    sub_limit_notes: str | None = None
    waiting_period_months: int | None = None


class DeductibleOrCopay(BaseModel):
    """Deductible or co-payment terms."""

    deductible: float | None = None
    copay_percent: float | None = None


class RiderAddon(BaseModel):
    """Rider or add-on benefit."""

    name: str | None = None
    amount: float | None = None


class CoverageDetails(BaseModel):
    """Coverage amounts, benefits, and sub-limits."""

    sum_insured: SumInsured = Field(default_factory=SumInsured)
    coverage_items: list[CoverageItem] = Field(default_factory=list)
    deductible_or_copay: DeductibleOrCopay = Field(default_factory=DeductibleOrCopay)
    riders_addons: list[RiderAddon] = Field(default_factory=list)
    network_or_geography: str | None = None


class PremiumDetails(BaseModel):
    """Premium schedule and payment amounts."""

    amount: float | None = None
    currency: str | None = "INR"
    frequency: str = (
        "annual"  # annual, semi_annual, quarterly, monthly, single, unknown
    )
    taxes: float | None = None
    total_payable: float | None = None
    payment_mode: str | None = None
    next_due_date: str | None = None


class ExclusionItem(BaseModel):
    """Exclusion clause description."""

    description: str
    category: str | None = None


class WaitingPeriodItem(BaseModel):
    """Waiting period rule."""

    item: str
    months: int = 0


class ClaimHistoryItem(BaseModel):
    """Previous claim entry."""

    claim_id: str | None = None
    date: str | None = None
    type: str | None = None
    amount_claimed: float | None = None
    amount_settled: float | None = None
    status: str = "settled"  # settled, rejected, pending, unknown
    reason: str | None = None


class NoClaimBonus(BaseModel):
    """No claim bonus status."""

    percent: float | None = None
    accumulated_amount: float | None = None


class EvidenceItem(BaseModel):
    """Textual evidence pointer with page and quote."""

    page: int = 1
    quote: str = ""


class ExtractionResult(BaseModel):
    """Full structured extraction schema (schema_version: '1.0')."""

    schema_version: str = "1.0"
    doc_type: str = (
        "policy"  # policy, claim_history, renewal_notice, premium_receipt, other
    )
    provider: ProviderInfo = Field(default_factory=ProviderInfo)
    policy: PolicyDetails = Field(default_factory=PolicyDetails)
    coverage: CoverageDetails = Field(default_factory=CoverageDetails)
    premium: PremiumDetails = Field(default_factory=PremiumDetails)
    exclusions: list[ExclusionItem] = Field(default_factory=list)
    waiting_periods: list[WaitingPeriodItem] = Field(default_factory=list)
    claims_history: list[ClaimHistoryItem] = Field(default_factory=list)
    no_claim_bonus: NoClaimBonus = Field(default_factory=NoClaimBonus)
    other_notes: list[str] = Field(default_factory=list)

    # Metadata & Quality
    field_confidence: dict[str, float] = Field(default_factory=dict)
    field_evidence: dict[str, EvidenceItem] = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    overall_confidence: float = 0.0


# ---------------------------------------------------------------------------
# API Request / Response Models (§6)
# ---------------------------------------------------------------------------


class DocumentSummary(BaseModel):
    """Summary of an uploaded document."""

    id: uuid.UUID
    lead_id: uuid.UUID
    original_filename: str
    mime_type: str
    size_bytes: int
    page_count: int
    doc_type: str
    is_scanned: bool
    processing_status: (
        str  # uploaded, queued, processing, extracted, needs_review, verified, failed
    )
    processing_error: str | None = None
    uploaded_by: str = "lead"
    created_at: datetime
    duplicate: bool = False


class DocumentUploadResponse(BaseModel):
    """Response returned upon uploading documents (202 Accepted)."""

    documents: list[DocumentSummary]


class DocumentPageSummary(BaseModel):
    """Extracted text snippet and metadata for a single page."""

    page_number: int
    text_length: int
    extraction_method: str
    ocr_confidence: float | None = None


class DocumentDetailResponse(DocumentSummary):
    """Full document detail including pages summary and extraction if ready."""

    pages: list[DocumentPageSummary] = Field(default_factory=list)
    extraction: ExtractionResult | None = None
    review_status: str | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    corrections: list[dict[str, Any]] = Field(default_factory=list)


class FieldCorrection(BaseModel):
    """Single field correction change."""

    path: str
    value: Any


class ExtractionCorrectionRequest(BaseModel):
    """Payload to patch extraction fields."""

    changes: list[FieldCorrection]


class ExtractionVerifyResponse(BaseModel):
    """Response after marking an extraction verified."""

    status: str = "verified"
    reviewed_at: datetime
    reviewed_by: uuid.UUID | None = None
