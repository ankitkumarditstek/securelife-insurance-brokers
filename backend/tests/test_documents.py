"""Tests for Document Processing, OCR, and Extraction pipeline according to FRD-03."""

import io
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.lead import Lead
from app.models.user import User
from app.repositories.conversation_repo import ConversationRepository
from app.repositories.lead_repo import LeadRepository
from app.schemas.document import ExtractionResult
from app.services.document_pipeline import process_document
from app.services.document_processor import (
    DocumentValidationError,
    inspect_and_extract_document,
    is_scanned_page,
    validate_document_bytes,
)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(
                email="admin@securelife.internal",
                full_name="Admin Broker",
                role="admin",
                password_hash="test",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token(subject=str(user.id), role=user.role)
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


@pytest.fixture
def test_lead() -> Lead:
    db = SessionLocal()
    try:
        lead_repo = LeadRepository(db)
        lead = lead_repo.create(
            full_name="Aarav Sharma",
            email="aarav.test@example.com",
            phone="+919876543210",
            status="qualified",
            qualification_score=85,
            qualification_tier="Tier 1",
        )
        return lead
    finally:
        db.close()


def test_validate_document_bytes_valid_pdf() -> None:
    sample_pdf = Path("sample_data/sample_1_clean_policy.pdf").read_bytes()
    mime = validate_document_bytes(sample_pdf, "sample_1_clean_policy.pdf")
    assert mime == "application/pdf"


def test_validate_document_bytes_unsupported() -> None:
    with pytest.raises(DocumentValidationError) as exc:
        validate_document_bytes(b"hello world plaintext", "notes.txt")
    assert exc.value.code == "UNSUPPORTED_TYPE"


def test_validate_document_bytes_empty() -> None:
    with pytest.raises(DocumentValidationError) as exc:
        validate_document_bytes(b"", "empty.pdf")
    assert exc.value.code == "EMPTY_FILE"


def test_is_scanned_page_detection() -> None:
    # Short or non-alphanumeric text
    assert is_scanned_page("   short  ") is True
    # Normal rich policy text
    long_text = "This is a detailed insurance policy schedule document with full alphanumeric characters and terms."
    assert is_scanned_page(long_text) is False


def test_inspect_and_extract_clean_pdf() -> None:
    pdf_bytes = Path("sample_data/sample_1_clean_policy.pdf").read_bytes()
    res = inspect_and_extract_document(pdf_bytes, "clean.pdf")
    assert res.page_count >= 1
    assert res.is_scanned is False
    assert len(res.pages) >= 1
    assert "STAR HEALTH" in res.pages[0].text


def test_inspect_and_extract_scanned_pdf() -> None:
    pdf_bytes = Path("sample_data/sample_2_scanned_policy.pdf").read_bytes()
    res = inspect_and_extract_document(pdf_bytes, "scanned.pdf")
    assert res.page_count >= 1
    assert res.is_scanned is True
    assert res.pages[0].extraction_method == "ocr"


def test_document_pipeline_e2e(test_lead: Lead) -> None:
    """Test full processing pipeline with storage, extraction, confidence, and lead status update."""
    client = TestClient(app)
    db = SessionLocal()
    try:
        sample_path = Path("sample_data/sample_1_clean_policy.pdf")
        pdf_bytes = sample_path.read_bytes()

        # Step 1: Upload via staff endpoint
        user = db.query(User).first()
        token = create_access_token(subject=str(user.id), role=user.role)
        headers = {"Authorization": f"Bearer {token}"}

        upload_resp = client.post(
            f"/api/v1/leads/{test_lead.id}/documents",
            headers=headers,
            files=[("files", ("policy.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
        )
        assert upload_resp.status_code == 202
        data = upload_resp.json()
        assert len(data["documents"]) == 1
        doc_id = uuid.UUID(data["documents"][0]["id"])

        # Step 2: Run processing pipeline directly with deterministic extractor mock
        from unittest.mock import patch
        from app.services.extraction_service import _extract_heuristically

        def mock_extract(pages, doc_type, **kwargs):
            raw = _extract_heuristically(pages, doc_type)
            return ExtractionResult(**raw), "needs_review"

        with patch("app.services.document_pipeline.extract_policy_document_data", side_effect=mock_extract):
            process_document(doc_id)

        # Step 3: Check document detail
        detail_resp = client.get(f"/api/v1/documents/{doc_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["processing_status"] in ["extracted", "needs_review"]
        assert detail["extraction"] is not None
        assert detail["extraction"]["policy"]["policy_number"] is not None
        assert detail["extraction"]["overall_confidence"] > 0.50

        # Step 4: Verify lead status transition to under_review
        lead_refreshed = db.get(Lead, test_lead.id)
        assert lead_refreshed.status == "under_review"

        # Step 5: Test corrections endpoint
        correction_resp = client.patch(
            f"/api/v1/documents/{doc_id}/extraction",
            headers=headers,
            json={
                "changes": [
                    {"path": "premium.amount", "value": 30000.0},
                    {"path": "provider.name", "value": "Corrected Star Health"},
                ]
            },
        )
        assert correction_resp.status_code == 200
        corr_data = correction_resp.json()
        assert corr_data["premium"]["amount"] == 30000.0
        assert corr_data["provider"]["name"] == "Corrected Star Health"

        # Step 6: Test verify endpoint
        verify_resp = client.post(
            f"/api/v1/documents/{doc_id}/extraction/verify",
            headers=headers,
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["status"] == "verified"

        # Step 7: Duplicate upload detection
        dup_resp = client.post(
            f"/api/v1/leads/{test_lead.id}/documents",
            headers=headers,
            files=[("files", ("policy.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
        )
        assert dup_resp.status_code == 202
        assert dup_resp.json()["documents"][0]["duplicate"] is True

        # Step 8: File preview / stream download
        file_resp = client.get(f"/api/v1/documents/{doc_id}/file")
        assert file_resp.status_code == 200
        assert file_resp.headers["content-type"] == "application/pdf"

    finally:
        db.close()


def test_public_upload_with_session_token(test_lead: Lead) -> None:
    """Test public upload card flow from ChatWindow."""
    client = TestClient(app)
    db = SessionLocal()
    try:
        conv_repo = ConversationRepository(db)
        session_token = f"sess_test_{uuid.uuid4().hex[:12]}"
        conv_repo.create_conversation(
            lead_id=test_lead.id,
            session_token=session_token,
        )

        sample_path = Path("sample_data/sample_3_multi_policy.pdf")
        pdf_bytes = sample_path.read_bytes()

        resp = client.post(
            "/api/v1/documents/upload",
            headers={"X-Session-Token": session_token},
            files=[
                ("files", ("care_policy.pdf", io.BytesIO(pdf_bytes), "application/pdf"))
            ],
        )
        assert resp.status_code == 202
        data = resp.json()
        assert len(data["documents"]) == 1
        assert data["documents"][0]["original_filename"] == "care_policy.pdf"

    finally:
        db.close()
