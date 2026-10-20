"""Integration tests for chat API endpoints (FRD-01 §5)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_session_lifecycle(client: AsyncClient) -> None:
    # 1. Start new session
    res = await client.post("/api/v1/chat/sessions")
    assert res.status_code == 201
    data = res.json()
    assert "session_token" in data
    assert "conversation_id" in data
    assert "lead_id" in data
    assert len(data["messages"]) == 1
    session_token = data["session_token"]
    assert "broker" in data["messages"][0]["content"].lower()

    # 2. Send message providing consent and name
    msg_res = await client.post(
        f"/api/v1/chat/sessions/{session_token}/messages",
        json={"content": "Yes sure, my name is Ravi Kumar"},
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["message"]["role"] == "assistant"
    assert msg_data["lead_status"] == "in_conversation"

    # 3. Resume session and verify transcript persistence
    resume_res = await client.get(f"/api/v1/chat/sessions/{session_token}")
    assert resume_res.status_code == 200
    resume_data = resume_res.json()
    assert resume_data["session_token"] == session_token
    assert len(resume_data["messages"]) >= 3  # greeting + user msg + bot reply

    # 4. End session
    end_res = await client.post(f"/api/v1/chat/sessions/{session_token}/end")
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "ended"


@pytest.mark.asyncio
async def test_chat_follow_up_after_qualification(client: AsyncClient) -> None:
    """Verify that after lead qualifies and email is provided, follow-up timeline answers are accepted smoothly."""
    # 1. Start session
    res = await client.post("/api/v1/chat/sessions")
    assert res.status_code == 201
    session_token = res.json()["session_token"]

    # 2. Provide profile and contact info
    msg_res1 = await client.post(
        f"/api/v1/chat/sessions/{session_token}/messages",
        json={
            "content": (
                "Yes I consent. My name is Rajesh Patel, age 32 in Mumbai. "
                "I need health insurance for my family and I currently have a policy. "
                "My email is rajesh.patel@example.com"
            )
        },
    )
    assert msg_res1.status_code == 200
    data1 = msg_res1.json()
    assert data1["lead_status"] == "qualified"

    # 3. Chatbot asks for timeline; user responds with '< 6 months'
    # This must NOT throw HTTP 400 (SESSION_INACTIVE) or HTTP 409
    msg_res2 = await client.post(
        f"/api/v1/chat/sessions/{session_token}/messages",
        json={"content": "I need it in less than 6 months, around renewal time."},
    )
    assert msg_res2.status_code == 200
    data2 = msg_res2.json()
    assert data2["message"]["role"] == "assistant"
    # Lead must stay qualified and conversation should conclude smoothly
    assert data2["lead_status"] == "qualified"
    assert data2["conversation_status"] == "complete"
    assert len(data2["message"]["content"]) > 0

