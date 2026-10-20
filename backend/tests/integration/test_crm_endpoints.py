"""Tests for FRD-02 CRM Data Storage endpoints and lifecycle governance."""

from typing import Any

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.user import User


@pytest.fixture
def auth_users(setup_test_db: Any) -> None:
    """Seed test users directly into test DB."""
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        broker = (
            db.query(User).filter(User.email == "test_broker@securelife.com").first()
        )
        if not broker:
            broker = User(
                email="test_broker@securelife.com",
                full_name="Broker Bob",
                password_hash=hash_password("password123"),
                role="broker",
                is_active=True,
            )
            db.add(broker)

        admin = db.query(User).filter(User.email == "test_admin@securelife.com").first()
        if not admin:
            admin = User(
                email="test_admin@securelife.com",
                full_name="Admin Alice",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
        db.commit()
    finally:
        db.close()


async def get_auth_token(client: AsyncClient, email: str, password: str) -> str:
    res = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert res.status_code == 200
    token: str = str(res.json()["access_token"])
    return token


@pytest.mark.asyncio
async def test_auth_login_and_me(client: AsyncClient, auth_users: None) -> None:
    # 1. Login with broker credentials
    token = await get_auth_token(client, "test_broker@securelife.com", "password123")
    assert token

    # 2. Call /auth/me with Bearer token
    res = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "test_broker@securelife.com"
    assert data["role"] == "broker"


@pytest.mark.asyncio
async def test_leads_lifecycle_and_rules(client: AsyncClient, auth_users: None) -> None:
    token = await get_auth_token(client, "test_broker@securelife.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a lead via chat session
    chat_res = await client.post("/api/v1/chat/sessions")
    assert chat_res.status_code == 201
    lead_id = chat_res.json()["lead_id"]

    # 2. Retrieve lead details via CRM GET /leads/{id}
    res = await client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["status"] == "new"
    assert detail["counts"]["messages"] >= 1

    # 3. Test invalid transition: 'new' cannot jump directly to 'qualified' -> Expect 409
    invalid_res = await client.post(
        f"/api/v1/leads/{lead_id}/status",
        json={"to_status": "qualified", "reason": "Attempt direct qualification"},
        headers=headers,
    )
    assert invalid_res.status_code == 409
    assert invalid_res.json()["detail"]["error"]["code"] == "INVALID_STATUS_TRANSITION"

    # 4. Valid transition to 'in_conversation'
    step1_res = await client.post(
        f"/api/v1/leads/{lead_id}/status",
        json={"to_status": "in_conversation", "reason": "Customer responded"},
        headers=headers,
    )
    assert step1_res.status_code == 200
    assert step1_res.json()["status"] == "in_conversation"

    # 5. Qualification integrity: cannot become 'qualified' without email or phone -> Expect 422
    qual_fail = await client.post(
        f"/api/v1/leads/{lead_id}/status",
        json={"to_status": "qualified"},
        headers=headers,
    )
    assert qual_fail.status_code == 422
    assert (
        qual_fail.json()["detail"]["error"]["code"]
        == "MISSING_CONTACT_FOR_QUALIFICATION"
    )

    # 6. Add contact details via PATCH /leads/{id}
    patch_res = await client.patch(
        f"/api/v1/leads/{lead_id}",
        json={
            "email": "rahul.test@example.com",
            "phone": "+919876543210",
            "full_name": "Rahul Verma",
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["email"] == "rahul.test@example.com"

    # 7. Now transition to 'qualified' succeeds
    qual_ok = await client.post(
        f"/api/v1/leads/{lead_id}/status",
        json={"to_status": "qualified", "reason": "Verified contact and intent"},
        headers=headers,
    )
    assert qual_ok.status_code == 200
    assert qual_ok.json()["status"] == "qualified"

    # 8. Verify audit history recorded
    hist_res = await client.get(f"/api/v1/leads/{lead_id}/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 2

    # 9. Add and list notes
    note_res = await client.post(
        f"/api/v1/leads/{lead_id}/notes",
        json={"body": "Customer requested callback tomorrow at 3 PM."},
        headers=headers,
    )
    assert note_res.status_code == 201
    notes_list = await client.get(f"/api/v1/leads/{lead_id}/notes", headers=headers)
    assert notes_list.status_code == 200
    assert len(notes_list.json()) >= 1


@pytest.mark.asyncio
async def test_dashboard_and_pipeline(client: AsyncClient, auth_users: None) -> None:
    token = await get_auth_token(client, "test_broker@securelife.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    # Summary
    sum_res = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200
    data = sum_res.json()
    assert "totals" in data
    assert "avg_hours_to_analysis" in data

    # Pipeline
    pipe_res = await client.get("/api/v1/dashboard/pipeline", headers=headers)
    assert pipe_res.status_code == 200
    pipe_data = pipe_res.json()
    assert len(pipe_data["stages"]) >= 5


@pytest.mark.asyncio
async def test_auth_system_security_checks(
    client: AsyncClient, auth_users: None
) -> None:
    """Verify auth rejection for invalid credentials, unauthenticated calls, and role guards."""
    # 1. Invalid password -> 401
    bad_pass_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "test_broker@securelife.com", "password": "wrong_password"},
    )
    assert bad_pass_res.status_code == 401
    assert bad_pass_res.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"

    # 2. Non-existent email -> 401
    bad_email_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@securelife.com", "password": "password123"},
    )
    assert bad_email_res.status_code == 401
    assert bad_email_res.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"

    # 3. Unauthenticated requests to protected endpoints -> 401
    unauth_sum = await client.get("/api/v1/dashboard/summary")
    assert unauth_sum.status_code == 401
    assert unauth_sum.json()["detail"]["error"]["code"] == "UNAUTHENTICATED"

    unauth_leads = await client.get("/api/v1/leads")
    assert unauth_leads.status_code == 401

    unauth_pipeline = await client.get("/api/v1/dashboard/pipeline")
    assert unauth_pipeline.status_code == 401

    # 4. Role enforcement: create lead, then non-admin attempts delete -> 403 Forbidden
    broker_token = await get_auth_token(
        client, "test_broker@securelife.com", "password123"
    )
    admin_token = await get_auth_token(client, "test_admin@securelife.com", "admin123")

    lead_res = await client.post("/api/v1/chat/sessions")
    lead_id = lead_res.json()["lead_id"]

    # Broker cannot delete lead (admin-only)
    del_forbidden = await client.delete(
        f"/api/v1/leads/{lead_id}",
        headers={"Authorization": f"Bearer {broker_token}"},
    )
    assert del_forbidden.status_code == 403
    assert del_forbidden.json()["detail"]["error"]["code"] == "FORBIDDEN"

    # Admin can delete lead
    del_admin = await client.delete(
        f"/api/v1/leads/{lead_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_admin.status_code == 204
