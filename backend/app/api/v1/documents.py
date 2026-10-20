"""Document processing and policy extraction endpoints according to FRD-03."""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.conversation_repo import ConversationRepository
from app.repositories.document_repo import DocumentRepository
from app.repositories.lead_repo import LeadRepository
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentPageSummary,
    DocumentSummary,
    DocumentUploadResponse,
    ExtractionCorrectionRequest,
    ExtractionResult,
    ExtractionVerifyResponse,
)
from app.services.document_pipeline import process_document, sync_lead_pipeline_status
from app.services.document_processor import (
    DocumentValidationError,
    validate_document_bytes,
)
from app.services.storage_service import get_storage_backend

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Documents"])
settings = get_settings()


def _to_document_summary(doc: Any, duplicate: bool = False) -> DocumentSummary:
    return DocumentSummary(
        id=doc.id,
        lead_id=doc.lead_id,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        doc_type=doc.doc_type,
        is_scanned=doc.is_scanned,
        processing_status=doc.processing_status,
        processing_error=doc.processing_error,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
        duplicate=duplicate,
    )


@router.post(
    "/leads/{lead_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_documents_for_lead(
    lead_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentUploadResponse:
    """Multipart document upload by staff for a specific lead."""
    lead_repo = LeadRepository(db)
    lead = lead_repo.get_by_id(lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "LEAD_NOT_FOUND", "message": "Lead not found"}},
        )

    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {"code": "NO_FILES", "message": "No files provided for upload"}
            },
        )

    if len(files) > settings.max_files_per_upload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "TOO_MANY_FILES",
                    "message": f"Maximum {settings.max_files_per_upload} files allowed per upload.",
                }
            },
        )

    storage = get_storage_backend()
    uploaded_summaries: list[DocumentSummary] = []

    for file in files:
        filename = file.filename or f"doc_{uuid.uuid4().hex[:8]}.pdf"
        content = await file.read()

        try:
            mime_type = validate_document_bytes(content, filename)
        except DocumentValidationError as ve:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": ve.code, "message": ve.message}},
            ) from ve

        sha256 = storage.compute_sha256(content)

        # Duplicate detection by sha256 per lead
        existing = DocumentRepository.get_by_sha256(db, lead_id, sha256)
        if existing:
            uploaded_summaries.append(_to_document_summary(existing, duplicate=True))
            continue

        # Save to disk
        stored_path, _ = storage.save_file(lead_id, content, filename)

        # Create document row in queued state
        doc = DocumentRepository.create_document(
            db=db,
            lead_id=lead_id,
            original_filename=filename,
            stored_path=stored_path,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=sha256,
            page_count=1,
            processing_status="queued",
            uploaded_by="user",
        )

        uploaded_summaries.append(_to_document_summary(doc, duplicate=False))
        background_tasks.add_task(process_document, doc.id)

    # Lead status update: qualified -> documents_pending on upload
    if lead.status == "qualified":
        old_status = lead.status
        lead.status = "documents_pending"
        lead_repo.record_status_history(
            lead_id=lead.id,
            from_status=old_status,
            to_status="documents_pending",
            reason="Initial document upload received",
            changed_by_type="user",
            changed_by_user_id=current_user.id,
        )
        db.commit()

    return DocumentUploadResponse(documents=uploaded_summaries)


@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def public_upload_documents(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    session_token: str | None = Header(None, alias="X-Session-Token"),
    token_query: str | None = Query(None, alias="session_token"),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    """Public upload from chatbot upload card using conversation session_token."""
    active_token = session_token or token_query
    if not active_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "MISSING_SESSION_TOKEN",
                    "message": "X-Session-Token header or session_token query required",
                }
            },
        )

    conv_repo = ConversationRepository(db)
    conversation = conv_repo.get_by_session_token(active_token)
    if not conversation or conversation.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_SESSION",
                    "message": "Session is expired or invalid",
                }
            },
        )

    lead_id = conversation.lead_id
    lead_repo = LeadRepository(db)
    lead = lead_repo.get_by_id(lead_id)

    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {"code": "NO_FILES", "message": "No files provided for upload"}
            },
        )

    if len(files) > settings.max_files_per_upload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "TOO_MANY_FILES",
                    "message": f"Maximum {settings.max_files_per_upload} files allowed per upload.",
                }
            },
        )

    storage = get_storage_backend()
    uploaded_summaries: list[DocumentSummary] = []

    for file in files:
        filename = file.filename or f"doc_{uuid.uuid4().hex[:8]}.pdf"
        content = await file.read()

        try:
            mime_type = validate_document_bytes(content, filename)
        except DocumentValidationError as ve:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": ve.code, "message": ve.message}},
            ) from ve

        sha256 = storage.compute_sha256(content)

        # Check duplicate
        existing = DocumentRepository.get_by_sha256(db, lead_id, sha256)
        if existing:
            uploaded_summaries.append(_to_document_summary(existing, duplicate=True))
            continue

        stored_path, _ = storage.save_file(lead_id, content, filename)

        doc = DocumentRepository.create_document(
            db=db,
            lead_id=lead_id,
            original_filename=filename,
            stored_path=stored_path,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=sha256,
            page_count=1,
            processing_status="queued",
            uploaded_by="lead",
        )

        uploaded_summaries.append(_to_document_summary(doc, duplicate=False))
        background_tasks.add_task(process_document, doc.id)

    if lead and lead.status == "qualified":
        old_status = lead.status
        lead.status = "documents_pending"
        lead_repo.record_status_history(
            lead_id=lead.id,
            from_status=old_status,
            to_status="documents_pending",
            reason="Public prospect document uploaded from chat card",
            changed_by_type="lead",
        )
        db.commit()

    return DocumentUploadResponse(documents=uploaded_summaries)


@router.get("/leads/{lead_id}/documents", response_model=list[DocumentSummary])
def list_lead_documents(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[DocumentSummary]:
    """List all documents for a specific lead."""
    docs = DocumentRepository.list_by_lead(db, lead_id)
    return [_to_document_summary(d) for d in docs]


@router.get("/documents/{id}", response_model=DocumentDetailResponse)
def get_document_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db),
) -> DocumentDetailResponse:
    """Get document status, pages count, and extraction result if ready."""
    doc = DocumentRepository.get_by_id(db, id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"}
            },
        )

    pages_summary = [
        DocumentPageSummary(
            page_number=p.page_number,
            text_length=len(p.text or ""),
            extraction_method=p.extraction_method,
            ocr_confidence=float(p.ocr_confidence)
            if p.ocr_confidence is not None
            else None,
        )
        for p in (doc.pages or [])
    ]

    extraction_result: ExtractionResult | None = None
    review_status: str | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    corrections_list: list[dict[str, Any]] = []

    if doc.extraction:
        ext = doc.extraction
        review_status = ext.review_status
        reviewed_by = ext.reviewed_by
        reviewed_at = ext.reviewed_at
        corrections_list = ext.corrections if isinstance(ext.corrections, list) else []
        try:
            extraction_result = ExtractionResult(**(ext.data or {}))
        except Exception as e:
            logger.warning("Could not parse saved extraction for doc %s: %s", id, e)

    return DocumentDetailResponse(
        id=doc.id,
        lead_id=doc.lead_id,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        doc_type=doc.doc_type,
        is_scanned=doc.is_scanned,
        processing_status=doc.processing_status,
        processing_error=doc.processing_error,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
        duplicate=False,
        pages=pages_summary,
        extraction=extraction_result,
        review_status=review_status,
        reviewed_by=reviewed_by,
        reviewed_at=reviewed_at,
        corrections=corrections_list,
    )


@router.get("/documents/{id}/file")
def get_document_file(
    id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Stream or preview original document file."""
    doc = DocumentRepository.get_by_id(db, id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"}
            },
        )

    storage = get_storage_backend()
    file_path = storage.get_file_path(doc.stored_path)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "FILE_NOT_FOUND",
                    "message": "Document file is not on disk",
                }
            },
        )

    return FileResponse(
        path=str(file_path),
        media_type=doc.mime_type,
        filename=doc.original_filename,
    )


@router.get("/documents/{id}/extraction", response_model=ExtractionResult)
def get_document_extraction(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ExtractionResult:
    """Retrieve structured extraction result for a document."""
    ext = DocumentRepository.get_extraction(db, id)
    if not ext or not ext.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "EXTRACTION_NOT_READY",
                    "message": "Extraction has not been generated for this document yet",
                }
            },
        )
    return ExtractionResult(**ext.data)


@router.patch("/documents/{id}/extraction", response_model=ExtractionResult)
def correct_document_extraction(
    id: uuid.UUID,
    req: ExtractionCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExtractionResult:
    """Apply corrections to extraction fields with audit history."""
    ext = DocumentRepository.apply_corrections(
        db=db,
        document_id=id,
        changes=req.changes,
        user_id=current_user.id,
    )
    if not ext or not ext.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "EXTRACTION_NOT_FOUND",
                    "message": "Extraction not found",
                }
            },
        )
    return ExtractionResult(**ext.data)


@router.post(
    "/documents/{id}/extraction/verify", response_model=ExtractionVerifyResponse
)
def verify_document_extraction(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExtractionVerifyResponse:
    """Mark extraction verified by analyst."""
    ext = DocumentRepository.verify_extraction(
        db=db,
        document_id=id,
        user_id=current_user.id,
    )
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "EXTRACTION_NOT_FOUND",
                    "message": "Extraction not found",
                }
            },
        )

    # Sync lead status in case it was pending review
    sync_lead_pipeline_status(db, ext.lead_id)

    return ExtractionVerifyResponse(
        status="verified",
        reviewed_at=ext.reviewed_at or datetime.now(UTC),
        reviewed_by=current_user.id,
    )


@router.post(
    "/documents/{id}/reprocess",
    response_model=DocumentSummary,
    status_code=status.HTTP_202_ACCEPTED,
)
def reprocess_document(
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> DocumentSummary:
    """Re-run processing pipeline for a failed or updated document."""
    doc = DocumentRepository.get_by_id(db, id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"}
            },
        )

    # Reset status
    doc = DocumentRepository.update_status(
        db=db,
        document_id=id,
        status="queued",
        error=None,
    )
    background_tasks.add_task(process_document, id)
    return _to_document_summary(doc)


@router.delete("/documents/{id}")
def delete_document(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Soft delete document."""
    success = DocumentRepository.soft_delete(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"}
            },
        )
    return {"deleted": True, "id": str(id)}
