"""Repository layer for Document, DocumentPage, and DocumentExtraction models."""

import copy
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.models.document import Document, DocumentExtraction, DocumentPage
from app.schemas.document import ExtractionResult, FieldCorrection

logger = logging.getLogger(__name__)


class DocumentRepository:
    """Database operations for insurance documents and structured extractions."""

    @staticmethod
    def get_by_id(db: Session, document_id: uuid.UUID) -> Document | None:
        """Fetch document by UUID with pages and extraction eager loaded."""
        stmt = (
            select(Document)
            .options(
                selectinload(Document.pages),
                selectinload(Document.extraction),
            )
            .where(Document.id == document_id, Document.deleted_at.is_(None))
        )
        return db.scalar(stmt)

    @staticmethod
    def get_by_sha256(db: Session, lead_id: uuid.UUID, sha256: str) -> Document | None:
        """Find existing active document with the same sha256 for this lead."""
        stmt = select(Document).where(
            Document.lead_id == lead_id,
            Document.sha256 == sha256,
            Document.deleted_at.is_(None),
        )
        return db.scalar(stmt)

    @staticmethod
    def list_by_lead(db: Session, lead_id: uuid.UUID) -> list[Document]:
        """List all non-deleted documents for a lead ordered by creation date."""
        stmt = (
            select(Document)
            .options(selectinload(Document.extraction))
            .where(
                Document.lead_id == lead_id,
                Document.deleted_at.is_(None),
            )
            .order_by(desc(Document.created_at))
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def create_document(
        db: Session,
        lead_id: uuid.UUID,
        original_filename: str,
        stored_path: str,
        mime_type: str,
        size_bytes: int,
        sha256: str,
        page_count: int = 1,
        doc_type: str = "policy",
        is_scanned: bool = False,
        processing_status: str = "queued",
        uploaded_by: str = "lead",
    ) -> Document:
        """Create a new document record."""
        doc = Document(
            lead_id=lead_id,
            original_filename=original_filename,
            stored_path=stored_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
            sha256=sha256,
            page_count=page_count,
            doc_type=doc_type,
            is_scanned=is_scanned,
            processing_status=processing_status,
            uploaded_by=uploaded_by,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def update_status(
        db: Session,
        document_id: uuid.UUID,
        status: str,
        error: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        page_count: int | None = None,
        is_scanned: bool | None = None,
        doc_type: str | None = None,
    ) -> Document | None:
        """Update processing lifecycle status and error message."""
        doc = db.get(Document, document_id)
        if not doc:
            return None

        doc.processing_status = status
        if error is not None:
            doc.processing_error = error
        if started_at is not None:
            doc.processing_started_at = started_at
        if finished_at is not None:
            doc.processing_finished_at = finished_at
        if page_count is not None:
            doc.page_count = page_count
        if is_scanned is not None:
            doc.is_scanned = is_scanned
        if doc_type is not None:
            doc.doc_type = doc_type

        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def save_pages(
        db: Session,
        document_id: uuid.UUID,
        pages_data: list[Any],
    ) -> list[DocumentPage]:
        """Save extracted pages into document_pages, replacing existing."""
        # Remove existing pages
        existing = db.scalars(
            select(DocumentPage).where(DocumentPage.document_id == document_id)
        ).all()
        for ep in existing:
            db.delete(ep)
        db.flush()

        pages = [
            DocumentPage(
                document_id=document_id,
                page_number=p.page_number,
                text=p.text,
                extraction_method=p.extraction_method,
                ocr_confidence=p.ocr_confidence,
            )
            for p in pages_data
        ]
        db.add_all(pages)
        db.commit()
        return pages

    @staticmethod
    def upsert_extraction(
        db: Session,
        document_id: uuid.UUID,
        lead_id: uuid.UUID,
        extraction: ExtractionResult,
        review_status: str,
        model: str | None = None,
        prompt_version: str = "extract_v1",
    ) -> DocumentExtraction:
        """Save structured extraction results."""
        stmt = select(DocumentExtraction).where(
            DocumentExtraction.document_id == document_id
        )
        existing = db.scalar(stmt)

        dumped_data = extraction.model_dump()
        field_conf = extraction.field_confidence
        field_evid = {k: v.model_dump() for k, v in extraction.field_evidence.items()}
        missing = extraction.missing_fields
        overall = extraction.overall_confidence

        if existing:
            existing.data = dumped_data
            existing.field_confidence = field_conf
            existing.field_evidence = field_evid
            existing.missing_fields = missing
            existing.overall_confidence = overall
            existing.review_status = review_status
            existing.model = model
            existing.prompt_version = prompt_version
            existing.updated_at = datetime.now(UTC)
            db.commit()
            db.refresh(existing)
            return existing

        new_extraction = DocumentExtraction(
            document_id=document_id,
            lead_id=lead_id,
            schema_version="1.0",
            data=dumped_data,
            field_confidence=field_conf,
            field_evidence=field_evid,
            missing_fields=missing,
            overall_confidence=overall,
            review_status=review_status,
            model=model,
            prompt_version=prompt_version,
        )
        db.add(new_extraction)
        db.commit()
        db.refresh(new_extraction)
        return new_extraction

    @staticmethod
    def get_extraction(
        db: Session, document_id: uuid.UUID
    ) -> DocumentExtraction | None:
        """Get extraction row by document id."""
        stmt = select(DocumentExtraction).where(
            DocumentExtraction.document_id == document_id
        )
        return db.scalar(stmt)

    @staticmethod
    def apply_corrections(
        db: Session,
        document_id: uuid.UUID,
        changes: list[FieldCorrection],
        user_id: uuid.UUID | None = None,
    ) -> DocumentExtraction | None:
        """Apply analyst edits, store audit trail, and set review_status to 'corrected'."""
        ext = DocumentRepository.get_extraction(db, document_id)
        if not ext:
            return None

        data_copy = copy.deepcopy(ext.data or {})
        existing_corrections: list[dict[str, Any]] = list(ext.corrections or [])
        now_iso = datetime.now(UTC).isoformat()

        for change in changes:
            path_parts = change.path.split(".")
            # Navigate dictionary path
            target = data_copy
            for part in path_parts[:-1]:
                if part not in target or not isinstance(target[part], dict):
                    target[part] = {}
                target = target[part]

            leaf = path_parts[-1]
            old_val = target.get(leaf)
            target[leaf] = change.value

            existing_corrections.append(
                {
                    "path": change.path,
                    "old": old_val,
                    "new": change.value,
                    "by": str(user_id) if user_id else "analyst",
                    "at": now_iso,
                }
            )

        ext.data = data_copy
        ext.corrections = existing_corrections
        flag_modified(ext, "data")
        flag_modified(ext, "corrections")
        ext.review_status = "corrected"
        ext.reviewed_by = user_id
        ext.reviewed_at = datetime.now(UTC)
        ext.updated_at = datetime.now(UTC)

        db.commit()
        db.refresh(ext)
        return ext

    @staticmethod
    def verify_extraction(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> DocumentExtraction | None:
        """Mark extraction verified by analyst."""
        ext = DocumentRepository.get_extraction(db, document_id)
        if not ext:
            return None

        ext.review_status = "verified"
        ext.reviewed_by = user_id
        ext.reviewed_at = datetime.now(UTC)
        ext.updated_at = datetime.now(UTC)

        # Also set document status to verified
        doc = db.get(Document, document_id)
        if doc:
            doc.processing_status = "verified"

        db.commit()
        db.refresh(ext)
        return ext

    @staticmethod
    def soft_delete(db: Session, document_id: uuid.UUID) -> bool:
        """Mark document deleted."""
        doc = db.get(Document, document_id)
        if not doc:
            return False
        doc.deleted_at = datetime.now(UTC)
        db.commit()
        return True
