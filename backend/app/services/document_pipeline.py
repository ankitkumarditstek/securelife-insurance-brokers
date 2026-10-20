"""End-to-end background document processing pipeline according to FRD-03."""

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.repositories.document_repo import DocumentRepository
from app.repositories.lead_repo import LeadRepository
from app.services.document_processor import (
    DocumentValidationError,
    inspect_and_extract_document,
)
from app.services.extraction_service import (
    classify_document_type,
    extract_policy_document_data,
)
from app.services.storage_service import get_storage_backend

logger = logging.getLogger(__name__)


def sync_lead_pipeline_status(db: Session, lead_id: uuid.UUID) -> None:
    """Sync lead status based on all document states for the lead."""
    lead_repo = LeadRepository(db)
    lead = lead_repo.get_by_id(lead_id)
    if not lead:
        return

    docs = DocumentRepository.list_by_lead(db, lead_id)
    if not docs:
        return

    # Check active document statuses
    statuses = [d.processing_status for d in docs]
    has_active_processing = any(
        s in ["uploaded", "queued", "processing"] for s in statuses
    )
    has_extracted = any(
        s in ["extracted", "needs_review", "verified"] for s in statuses
    )

    if has_active_processing:
        if lead.status in ["new", "in_conversation", "qualified", "documents_pending"]:
            old_status = lead.status
            lead.status = "documents_processing"
            lead_repo.record_status_history(
                lead_id=lead.id,
                from_status=old_status,
                to_status="documents_processing",
                reason="Document processing pipeline in progress",
                changed_by_type="system",
            )
            db.commit()
    elif has_extracted and lead.status in [
        "documents_pending",
        "documents_processing",
        "qualified",
    ]:
        old_status = lead.status
        lead.status = "under_review"
        lead_repo.record_status_history(
            lead_id=lead.id,
            from_status=old_status,
            to_status="under_review",
            reason="All uploaded insurance documents processed and ready for broker review",
            changed_by_type="system",
        )
        db.commit()


def process_document(document_id: uuid.UUID) -> None:
    """Execute complete document processing pipeline for a single document.

    Idempotent: can be safely invoked for retry or reprocessing.
    """
    db: Session = SessionLocal()
    storage = get_storage_backend()
    now_utc = datetime.now(UTC)

    try:
        doc = DocumentRepository.get_by_id(db, document_id)
        if not doc:
            logger.error("Document %s not found for processing", document_id)
            return

        logger.info(
            "Starting processing pipeline for document %s (%s)",
            document_id,
            doc.original_filename,
        )

        # Update status to processing
        DocumentRepository.update_status(
            db=db,
            document_id=document_id,
            status="processing",
            started_at=now_utc,
            error=None,
        )
        sync_lead_pipeline_status(db, doc.lead_id)

        # Read file from storage
        file_path = storage.get_file_path(doc.stored_path)
        if not file_path.is_file():
            raise DocumentValidationError(
                code="FILE_MISSING",
                message=f"Stored file '{doc.stored_path}' not found on disk.",
            )

        file_bytes = file_path.read_bytes()

        # Step 1: Text layer extraction & OCR fallback
        inspection = inspect_and_extract_document(
            file_bytes=file_bytes,
            filename=doc.original_filename,
        )

        # Step 2: Save pages
        DocumentRepository.save_pages(db, document_id, inspection.pages)

        # Step 3: Classify doc type
        doc_type = classify_document_type(inspection.pages, lead_id=doc.lead_id, db=db)

        # Update document inspection metadata
        DocumentRepository.update_status(
            db=db,
            document_id=document_id,
            status="processing",
            page_count=inspection.page_count,
            is_scanned=inspection.is_scanned,
            doc_type=doc_type,
        )

        # Step 4: Structured Policy Extraction via LLM
        extraction, review_status = extract_policy_document_data(
            pages=inspection.pages,
            doc_type=doc_type,
            lead_id=doc.lead_id,
            document_id=doc.id,
            db=db,
        )

        # Append any OCR quality warnings
        for w in inspection.warnings:
            if w not in extraction.warnings:
                extraction.warnings.append(w)

        # Step 5: Save extraction result
        DocumentRepository.upsert_extraction(
            db=db,
            document_id=document_id,
            lead_id=doc.lead_id,
            extraction=extraction,
            review_status=review_status,
            model="llama-3.3-70b-versatile",
            prompt_version="extract_v1",
        )

        # Step 6: Mark final terminal state
        final_status = (
            "needs_review" if review_status == "needs_review" else "extracted"
        )
        finished_utc = datetime.now(UTC)
        DocumentRepository.update_status(
            db=db,
            document_id=document_id,
            status=final_status,
            finished_at=finished_utc,
            error=None,
        )

        # Step 7: Synchronize lead status
        sync_lead_pipeline_status(db, doc.lead_id)

        logger.info(
            "Document %s processing finished successfully with status=%s, confidence=%.2f",
            document_id,
            final_status,
            extraction.overall_confidence,
        )

    except DocumentValidationError as ve:
        logger.warning(
            "Document validation failure for %s: [%s] %s",
            document_id,
            ve.code,
            ve.message,
        )
        DocumentRepository.update_status(
            db=db,
            document_id=document_id,
            status="failed",
            error=f"{ve.code}: {ve.message}",
            finished_at=datetime.now(UTC),
        )
        # Even if one doc fails, check if other docs completed
        if doc and doc.lead_id:
            sync_lead_pipeline_status(db, doc.lead_id)

    except Exception as e:
        logger.exception("Unexpected error processing document %s: %s", document_id, e)
        DocumentRepository.update_status(
            db=db,
            document_id=document_id,
            status="failed",
            error=f"PROCESSING_ERROR: {e}",
            finished_at=datetime.now(UTC),
        )
        if doc and doc.lead_id:
            sync_lead_pipeline_status(db, doc.lead_id)

    finally:
        db.close()
