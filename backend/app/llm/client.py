"""Provider-agnostic LangChain LLM Client Factory (Groq, OpenAI, Mock)."""

import logging
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage

from app.core.config import get_settings
from app.schemas.slots import ExtractedSlotValue, IntentType, TurnExtractionOutput

logger = logging.getLogger(__name__)


class MockStructuredChatModel(BaseChatModel):
    """Deterministic Mock LLM for local offline development and test suites."""

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> Any:
        last_user_msg = ""
        for m in reversed(messages):
            if m.type == "human" or getattr(m, "role", "") == "user":
                last_user_msg = str(m.content).strip()
                break

        last_lower = last_user_msg.lower()

        extracted_slots: dict[str, ExtractedSlotValue] = {}
        intent = IntentType.ANSWER
        reply = "Thank you for sharing that. Could you tell me your location?"
        next_slot = "location"

        # Heuristic extraction for mock test flows
        if any(w in last_lower for w in ["yes", "sure", "ok", "agree"]):
            extracted_slots["consent_given"] = ExtractedSlotValue(
                value=True, confidence=0.95
            )
            reply = "Great! To get started, what is your full name?"
            next_slot = "full_name"

        if "ravi" in last_lower:
            extracted_slots["full_name"] = ExtractedSlotValue(
                value="Ravi Kumar", confidence=0.95
            )
            reply = (
                "Nice to meet you! What type of insurance are you looking for "
                "(e.g. Health, Life, Motor)?"
            )
            next_slot = "insurance_interest"

        if "health" in last_lower:
            extracted_slots["insurance_interest"] = ExtractedSlotValue(
                value=["health"], confidence=0.95
            )
            reply = "Understood. Do you currently have an existing health policy?"
            next_slot = "has_existing_policy"

        if "pune" in last_lower:
            extracted_slots["location"] = ExtractedSlotValue(
                value="Pune", confidence=0.95
            )
            reply = "Got it, Pune. What is your age or age range?"
            next_slot = "age_range"

        if "34" in last_lower:
            extracted_slots["age_range"] = ExtractedSlotValue(
                value="26-35", confidence=0.9
            )
            reply = "Understood. What is the best email or phone number to reach you?"
            next_slot = "email"

        if "@" in last_lower:
            extracted_slots["email"] = ExtractedSlotValue(
                value="ravi@example.com", confidence=0.95
            )
            reply = (
                "Thank you. When is your policy renewal or "
                "when would you like to start?"
            )
            next_slot = "renewal_timeframe"

        turn_output = TurnExtractionOutput(
            reply=reply,
            extracted_slots=extracted_slots,
            intent=intent,
            next_slot_to_ask=next_slot,
            is_complete=False,
        )

        return type(
            "ChatResult",
            (),
            {
                "generations": [
                    type(
                        "ChatGeneration",
                        (),
                        {"message": AIMessage(content=turn_output.model_dump_json())},
                    )()
                ]
            },
        )()

    @property
    def _llm_type(self) -> str:
        return "mock_chat_model"

    def with_structured_output(self, schema: Any, **kwargs: Any) -> Any:
        return self


def get_llm_client() -> BaseChatModel:
    """Instantiate configured LangChain chat model based on environment settings."""
    settings = get_settings()
    provider = settings.llm_provider.lower()

    if provider == "groq" and (settings.groq_api_key or settings.llm_api_key):
        try:
            from langchain_groq import ChatGroq
            from pydantic import SecretStr

            raw_key = settings.groq_api_key or settings.llm_api_key
            return ChatGroq(
                model=settings.llm_chat_model,
                api_key=SecretStr(raw_key),
                temperature=0.3,
            )
        except Exception as e:
            logger.warning(
                "Could not initialize ChatGroq: %s. Falling back to MockChatModel.", e
            )

    elif provider == "openai" and (settings.openai_api_key or settings.llm_api_key):
        try:
            from langchain_openai import ChatOpenAI
            from pydantic import SecretStr

            raw_key = settings.openai_api_key or settings.llm_api_key
            return ChatOpenAI(
                model="gpt-4o-mini",
                api_key=SecretStr(raw_key),
                temperature=0.3,
            )
        except Exception as e:
            logger.warning(
                "Could not initialize ChatOpenAI: %s. Falling back to MockChatModel.", e
            )

    # Default fallback for test environments or when no external API key is configured
    return MockStructuredChatModel()
