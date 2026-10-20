"""Pydantic schemas for extracted chat slots and LLM structured outputs."""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class IntentType(StrEnum):
    """User intent classification."""

    ANSWER = "answer"
    QUESTION = "question"
    SMALLTALK = "smalltalk"
    REFUSAL = "refusal"
    OUT_OF_SCOPE = "out_of_scope"
    HANDOFF_REQUEST = "handoff_request"
    DONE = "done"


class InsuranceType(StrEnum):
    """Supported insurance lines."""

    LIFE = "life"
    HEALTH = "health"
    MOTOR = "motor"
    HOME = "home"
    TRAVEL = "travel"
    BUSINESS = "business"
    OTHER = "other"


class AgeRange(StrEnum):
    """Age bracket enum."""

    R_18_25 = "18-25"
    R_26_35 = "26-35"
    R_36_45 = "36-45"
    R_46_55 = "46-55"
    R_56_65 = "56-65"
    R_65_PLUS = "65+"


class RenewalTimeframe(StrEnum):
    """Renewal urgency timeframe."""

    LESS_THAN_1M = "<1m"
    ONE_TO_THREE_M = "1-3m"
    THREE_TO_SIX_M = "3-6m"
    SIX_M_PLUS = "6m+"
    UNKNOWN = "unknown"


class ExtractedSlotValue(BaseModel):
    """Container for an individual extracted slot with confidence."""

    value: Any
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


class TurnExtractionOutput(BaseModel):
    """Structured LLM response for each conversation turn."""

    reply: str = Field(description="Conversational response shown to the user")
    extracted_slots: dict[str, ExtractedSlotValue] = Field(
        default_factory=dict,
        description="Dictionary of slot keys to extracted value and confidence",
    )
    intent: IntentType = Field(
        default=IntentType.ANSWER,
        description="High level intent detected from user message",
    )
    needs_clarification: dict[str, str] = Field(
        default_factory=dict,
        description="Map of slot_key to reason why clarification is needed",
    )
    next_slot_to_ask: str | None = Field(
        default=None,
        description="Next slot to ask about, or None if complete/answering query",
    )
    is_complete: bool = Field(
        default=False,
        description="Whether all mandatory slots have been gathered or declined",
    )
