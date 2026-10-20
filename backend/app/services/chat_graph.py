"""LangGraph Conversation StateGraph Workflow (FRD-01 §4a)."""

import json
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.core.config import get_settings
from app.llm.client import get_llm_client
from app.llm.prompts.chat_v1 import SYSTEM_PROMPT
from app.schemas.slots import TurnExtractionOutput
from app.services.qualification import calculate_qualification_score
from app.services.slot_validator import validate_and_normalize_slots


class ChatGraphState(TypedDict, total=False):
    """State definition for LangGraph conversation turns."""

    session_token: str
    conversation_id: str
    lead_id: str
    user_message: str
    history: list[dict[str, str]]
    current_slots: dict[str, Any]
    declined_slots: list[str]
    turn_count: int
    raw_extracted: dict[str, Any]
    validated_slots: dict[str, Any]
    invalid_reasons: dict[str, str]
    bot_reply: str
    intent: str
    qualification_score: int
    qualification_tier: str
    qualification_breakdown: dict[str, Any]
    lead_status: str
    conversation_status: str
    ui_actions: list[dict[str, Any]]
    is_complete: bool


def determine_next_slot_hint(current_slots: dict[str, Any], declined: list[str]) -> str:
    """Determine highest priority missing slot."""
    priority = [
        ("consent_given", "confirmation of consent to proceed"),
        ("full_name", "user's full name"),
        ("insurance_interest", "type of insurance needed (health, life, etc.)"),
        ("has_existing_policy", "whether user has an existing policy"),
        ("age_range", "age or age bracket (18-25, 26-35, etc.)"),
        ("location", "city or region"),
        ("contact", "email or phone number for follow up"),
        ("renewal_timeframe", "renewal urgency or desired start date (e.g. < 6 months, 1-3 months)"),
        ("main_concern", "primary coverage priority or concern"),
    ]
    for key, desc in priority:
        if key == "contact":
            if not current_slots.get("email") and not current_slots.get("phone"):
                return f"Missing contact details ({desc})"
        elif (
            current_slots.get(key) is None
            and key not in declined
            and str(current_slots.get(key)).lower() != "unknown"
        ):
            return f"Missing slot '{key}' ({desc})"
    return (
        "All key details collected! Confirm they are pre-qualified, warmly wrap up the discussion, "
        "reassure them that a licensed broker will review their file and reach out shortly, "
        "and invite them to upload their policy schedule below if they'd like an instant comparison. "
        "Do NOT ask any more questions—bring the consultation to a smooth, positive close."
    )


def load_state_node(state: ChatGraphState) -> ChatGraphState:
    """Node 1: Load and prepare context for the turn."""
    turn_count = state.get("turn_count", 0) + 1
    current_slots = dict(state.get("current_slots", {}))
    declined_slots = list(state.get("declined_slots", []))
    history = list(state.get("history", []))

    return {
        **state,
        "turn_count": turn_count,
        "current_slots": current_slots,
        "declined_slots": declined_slots,
        "history": history,
    }


def llm_turn_node(state: ChatGraphState) -> ChatGraphState:
    """Node 2: Invoke LangChain LLM with structured output."""
    current_slots = state.get("current_slots", {})
    declined_slots = state.get("declined_slots", [])
    user_message = state.get("user_message", "")
    history = state.get("history", [])

    next_slot_hint = determine_next_slot_hint(current_slots, declined_slots)
    system_text = SYSTEM_PROMPT.format(
        current_slots_json=json.dumps(current_slots),
        next_slot_hint=next_slot_hint,
    )

    llm = get_llm_client()

    messages: list[SystemMessage | HumanMessage] = [SystemMessage(content=system_text)]
    for h in history[-8:]:  # keep last 8 turns for context window efficiency
        role = h.get("role", "user")
        content = h.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(SystemMessage(content=content))

    messages.append(HumanMessage(content=user_message))

    try:
        # Request structured output matching TurnExtractionOutput
        structured_llm = llm.with_structured_output(TurnExtractionOutput)
        res = structured_llm.invoke(messages)

        if isinstance(res, TurnExtractionOutput):
            turn_output = res
        elif isinstance(res, dict):
            turn_output = TurnExtractionOutput(**res)
        elif hasattr(res, "content") and isinstance(res.content, str):
            try:
                turn_output = TurnExtractionOutput.model_validate_json(res.content)
            except Exception:
                turn_output = TurnExtractionOutput(
                    reply=str(res.content),
                    extracted_slots={},
                )
        else:
            turn_output = TurnExtractionOutput(
                reply="Could you tell me more about what coverage you are looking for?",
                extracted_slots={},
            )
    except Exception:
        # Fallback on LLM failure
        turn_output = TurnExtractionOutput(
            reply=(
                "Thanks for that information. "
                "Could you please share your city or region?"
            ),
            extracted_slots={},
        )

    # Convert extracted slots to plain dict
    raw_extracted: dict[str, Any] = {}
    for k, v in turn_output.extracted_slots.items():
        raw_extracted[k] = v.value if hasattr(v, "value") else v

    return {
        **state,
        "bot_reply": turn_output.reply,
        "intent": getattr(turn_output.intent, "value", str(turn_output.intent)),
        "raw_extracted": raw_extracted,
    }


def validate_slots_node(state: ChatGraphState) -> ChatGraphState:
    """Node 3: Validate and normalize extracted slots using deterministic code."""
    raw_extracted = state.get("raw_extracted", {})
    valid, invalid = validate_and_normalize_slots(raw_extracted)

    return {
        **state,
        "validated_slots": valid,
        "invalid_reasons": invalid,
    }


def update_state_node(state: ChatGraphState) -> ChatGraphState:
    """Node 4: Merge validated slots into session state and check completion."""
    current_slots = dict(state.get("current_slots", {}))
    declined_slots = list(state.get("declined_slots", []))
    validated = state.get("validated_slots", {})

    for k, v in validated.items():
        if v == "declined":
            if k not in declined_slots:
                declined_slots.append(k)
        else:
            current_slots[k] = v

    # Completion criteria check (FRD-01 §4.6)
    has_contact = bool(current_slots.get("email") or current_slots.get("phone"))
    has_core = (
        current_slots.get("consent_given") is not None
        and current_slots.get("full_name") is not None
        and current_slots.get("insurance_interest") is not None
        and current_slots.get("has_existing_policy") is not None
        and current_slots.get("age_range") is not None
        and current_slots.get("location") is not None
    )
    has_timeline = (
        current_slots.get("renewal_timeframe") is not None
        or "renewal_timeframe" in declined_slots
    )
    is_complete = (has_core and has_contact and has_timeline) or state.get("turn_count", 0) >= 20

    return {
        **state,
        "current_slots": current_slots,
        "declined_slots": declined_slots,
        "is_complete": is_complete,
    }


def score_node(state: ChatGraphState) -> ChatGraphState:
    """Node 5: Compute deterministic qualification score and assign lifecycle status."""
    current_slots = state.get("current_slots", {})
    is_complete = state.get("is_complete", False)
    settings = get_settings()

    score, tier, breakdown = calculate_qualification_score(current_slots)

    ui_actions = list(state.get("ui_actions", []))
    has_contact = bool(current_slots.get("email") or current_slots.get("phone"))
    existing_status = state.get("lead_status", "in_conversation")

    # If lead was already qualified in a prior turn or score meets threshold with contact
    if existing_status == "qualified" or (score >= settings.qualification_threshold and has_contact):
        lead_status = "qualified"
        # If qualified and has policy, prompt to upload
        if current_slots.get("has_existing_policy") is True:
            existing_upload = any(a.get("type") == "show_upload" for a in ui_actions)
            if not existing_upload:
                ui_actions.append(
                    {
                        "type": "show_upload",
                        "lead_id": state.get("lead_id"),
                        "payload": {
                            "message": (
                                "You're pre-qualified! Please upload your policy PDF "
                                "below to compare coverage."
                            )
                        },
                    }
                )
    elif is_complete and score < settings.qualification_threshold:
        lead_status = "disqualified"
    else:
        lead_status = "in_conversation"

    if is_complete:
        conversation_status = "complete"
    else:
        conversation_status = "active"

    return {
        **state,
        "qualification_score": score,
        "qualification_tier": tier,
        "qualification_breakdown": breakdown,
        "lead_status": lead_status,
        "conversation_status": conversation_status,
        "ui_actions": ui_actions,
    }


def create_chat_graph() -> Any:
    """Construct and compile the LangGraph workflow."""
    workflow = StateGraph(ChatGraphState)

    workflow.add_node("load_state", load_state_node)
    workflow.add_node("llm_turn", llm_turn_node)
    workflow.add_node("validate_slots", validate_slots_node)
    workflow.add_node("update_state", update_state_node)
    workflow.add_node("score", score_node)

    workflow.set_entry_point("load_state")
    workflow.add_edge("load_state", "llm_turn")
    workflow.add_edge("llm_turn", "validate_slots")
    workflow.add_edge("validate_slots", "update_state")
    workflow.add_edge("update_state", "score")
    workflow.add_edge("score", END)

    return workflow.compile()


chat_graph = create_chat_graph()
