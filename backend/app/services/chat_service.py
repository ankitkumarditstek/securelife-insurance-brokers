"""Chat service orchestrating sessions, turns, and LangGraph workflow."""

import contextlib
import secrets

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.repositories.conversation_repo import ConversationRepository
from app.repositories.lead_repo import LeadRepository
from app.schemas.chat import (
    ChatMessageResponse,
    CreateSessionResponse,
    SendMessageResponse,
    SessionResumeResponse,
    UIAction,
)
from app.services.chat_graph import ChatGraphState, chat_graph
from app.services.lead_service import LeadService


class ChatService:
    """High-level service for conversational lead capture."""

    def __init__(self, db: Session):
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.lead_repo = LeadRepository(db)
        self.lead_service = LeadService(db)
        self.settings = get_settings()

    def start_session(self) -> CreateSessionResponse:
        """Create new lead, chat session, and generate greeting message."""
        session_token = secrets.token_hex(24)

        # 1. Create Lead in 'new' state
        lead = self.lead_repo.create(
            status="new",
            source="web_chat",
            captured_data={},
        )

        # 2. Create Conversation
        conversation = self.conv_repo.create_conversation(
            lead_id=lead.id,
            session_token=session_token,
            expiry_days=self.settings.session_expiry_days,
        )

        # 3. Add Initial Greeting Message
        greeting_text = (
            "Hi! I'm SecureLife's assistant. I can help figure out the right "
            "insurance for you and your family. I'll save what you share so "
            "a licensed broker can follow up — is that okay?"
        )
        greeting_msg = self.conv_repo.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=greeting_text,
            metadata={"intent": "greeting", "slot_hint": "consent_given"},
        )

        return CreateSessionResponse(
            session_token=session_token,
            conversation_id=conversation.id,
            lead_id=lead.id,
            messages=[
                ChatMessageResponse(
                    id=greeting_msg.id,
                    role=greeting_msg.role,
                    content=greeting_msg.content,
                    created_at=greeting_msg.created_at,
                    metadata=greeting_msg.message_metadata,
                )
            ],
        )

    def process_message(
        self, session_token: str, user_content: str
    ) -> SendMessageResponse:
        """Execute a conversation turn through the LangGraph StateGraph."""
        conversation = self.conv_repo.get_by_session_token(session_token)
        if not conversation:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "SESSION_NOT_FOUND",
                        "message": "Chat session not found",
                    }
                },
            )

        # Only reject if conversation was explicitly terminated
        if conversation.status == "ended":
            raise HTTPException(
                status_code=400,
                detail={
                    "error": {
                        "code": "SESSION_INACTIVE",
                        "message": "Chat session has ended. Please start a new session.",
                    }
                },
            )

        lead = self.lead_repo.get_by_id(conversation.lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Associated lead not found")

        # 1. Record User Message
        self.conv_repo.add_message(
            conversation_id=conversation.id,
            role="user",
            content=user_content,
        )

        # 2. Transition lead from 'new' to 'in_conversation' if initial turn
        if lead.status == "new":
            lead, _ = self.lead_service.transition(
                lead.id,
                "in_conversation",
                actor="system",
                reason="User began chat conversation",
            )

        # 3. Prepare LangGraph Input State
        db_messages = self.conv_repo.get_messages(conversation.id)
        history = [{"role": m.role, "content": m.content} for m in db_messages[:-1]]

        state_data = dict(conversation.state or {})
        current_slots = dict(state_data.get("slots", {}))
        declined_slots = list(state_data.get("declined", []))

        graph_input: ChatGraphState = {
            "session_token": session_token,
            "conversation_id": str(conversation.id),
            "lead_id": str(lead.id),
            "user_message": user_content,
            "history": history,
            "current_slots": current_slots,
            "declined_slots": declined_slots,
            "turn_count": conversation.turn_count,
            "lead_status": lead.status,
            "ui_actions": [],
        }

        # 4. Invoke LangGraph Execution
        graph_output = chat_graph.invoke(graph_input)

        bot_reply = graph_output.get(
            "bot_reply",
            "Thank you. Could you share your location so we can check coverage?",
        )
        updated_slots = graph_output.get("current_slots", {})
        declined_slots = graph_output.get("declined_slots", [])
        score = graph_output.get("qualification_score", 0)
        tier = graph_output.get("qualification_tier", "cold")
        breakdown = graph_output.get("qualification_breakdown", {})
        target_lead_status = graph_output.get("lead_status", lead.status)
        conv_status = graph_output.get("conversation_status", conversation.status)
        ui_actions_raw = graph_output.get("ui_actions", [])

        # 5. Persist Assistant Reply
        assistant_msg = self.conv_repo.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=bot_reply,
            metadata={
                "intent": graph_output.get("intent", "answer"),
                "extracted": graph_output.get("validated_slots", {}),
                "score": score,
                "tier": tier,
            },
        )

        # 6. Update Conversation State and Turn Count
        conversation.turn_count += 1
        conversation.status = conv_status
        conversation.state = {
            "slots": updated_slots,
            "declined": declined_slots,
            "attempts": state_data.get("attempts", {}),
        }
        self.conv_repo.update_conversation(
            conversation,
            turn_count=conversation.turn_count,
            status=conversation.status,
            state=conversation.state,
        )

        # 7. Update Lead Profile Columns and Scoring
        self.lead_service.update_captured_slots(lead.id, updated_slots)
        self.lead_repo.update(
            lead,
            qualification_score=score,
            qualification_tier=tier,
            qualification_breakdown=breakdown,
        )

        # 8. Transition Lead Status if complete
        if target_lead_status != lead.status:
            with contextlib.suppress(HTTPException):
                lead, _ = self.lead_service.transition(
                    lead.id,
                    target_lead_status,
                    actor="system",
                    reason=(
                        f"Chat completed with qualification tier {tier} "
                        f"(Score: {score})"
                    ),
                )

        # 9. Format UI Actions
        ui_actions = [
            UIAction(
                type=act["type"],
                lead_id=lead.id,
                payload=act.get("payload", {}),
            )
            for act in ui_actions_raw
        ]

        return SendMessageResponse(
            message=ChatMessageResponse(
                id=assistant_msg.id,
                role=assistant_msg.role,
                content=assistant_msg.content,
                created_at=assistant_msg.created_at,
                metadata=assistant_msg.message_metadata,
            ),
            captured=updated_slots,
            conversation_status=conversation.status,
            lead_status=lead.status,
            ui_actions=ui_actions,
        )

    def resume_session(self, session_token: str) -> SessionResumeResponse:
        """Fetch message history and active slots to resume chat widget."""
        conversation = self.conv_repo.get_by_session_token(session_token)
        if not conversation:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "SESSION_NOT_FOUND",
                        "message": "Session not found",
                    }
                },
            )

        lead = self.lead_repo.get_by_id(conversation.lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        messages = self.conv_repo.get_messages(conversation.id)
        state_data = conversation.state or {}
        captured_slots = state_data.get("slots", {})

        ui_actions: list[UIAction] = []
        if (
            lead.status == "qualified"
            and captured_slots.get("has_existing_policy") is True
        ):
            ui_actions.append(
                UIAction(
                    type="show_upload",
                    lead_id=lead.id,
                    payload={
                        "message": "Upload your existing insurance document to compare."
                    },
                )
            )

        return SessionResumeResponse(
            session_token=session_token,
            conversation_id=conversation.id,
            lead_id=lead.id,
            conversation_status=conversation.status,
            lead_status=lead.status,
            messages=[
                ChatMessageResponse(
                    id=m.id,
                    role=m.role,
                    content=m.content,
                    created_at=m.created_at,
                    metadata=m.message_metadata,
                )
                for m in messages
            ],
            captured_slots=captured_slots,
            ui_actions=ui_actions,
        )

    def end_session(self, session_token: str) -> dict[str, str]:
        """Mark conversation ended."""
        conversation = self.conv_repo.get_by_session_token(session_token)
        if not conversation:
            raise HTTPException(status_code=404, detail="Session not found")

        self.conv_repo.update_conversation(conversation, status="ended")
        return {"status": "ended"}
