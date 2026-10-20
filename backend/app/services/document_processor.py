"""Document validation, text layer extraction, and OCR fallback service."""

import io
import logging
from pathlib import Path
from typing import Any, NamedTuple

import pypdf
import pytesseract
from PIL import Image, ImageEnhance, ImageOps

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Supported MIME types
SUPPORTED_MIME_TYPES = {
    "application/pdf": [b"%PDF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
}


class ExtractedPage(NamedTuple):
    """Result of processing a single document page."""

    page_number: int
    text: str
    extraction_method: str  # text_layer, ocr
    ocr_confidence: float | None
    is_scanned: bool


class DocumentInspectionResult(NamedTuple):
    """Overall inspection and text extraction result for a document."""

    page_count: int
    is_scanned: bool
    pages: list[ExtractedPage]
    warnings: list[str]


class DocumentValidationError(Exception):
    """Validation failed for uploaded file."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def sniff_mime_type(content: bytes, filename: str) -> str:
    """Sniff real MIME type using magic byte headers, falling back to extension."""
    for mime, signatures in SUPPORTED_MIME_TYPES.items():
        for sig in signatures:
            if content.startswith(sig):
                return mime

    # Fallback to file extension
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "application/pdf"
    if ext in [".png"]:
        return "image/png"
    if ext in [".jpg", ".jpeg"]:
        return "image/jpeg"

    raise DocumentValidationError(
        code="UNSUPPORTED_TYPE",
        message=f"File type not supported for '{filename}'. Allowed: PDF, PNG, JPG.",
    )


def validate_document_bytes(content: bytes, filename: str) -> str:
    """Validate file size and MIME type according to FR-3.1."""
    settings = get_settings()

    if len(content) == 0:
        raise DocumentValidationError(
            code="EMPTY_FILE",
            message=f"Uploaded file '{filename}' is empty.",
        )

    if len(content) > settings.max_upload_size_bytes:
        max_mb = settings.max_upload_size_bytes // (1024 * 1024)
        raise DocumentValidationError(
            code="FILE_TOO_LARGE",
            message=f"File '{filename}' exceeds {max_mb} MB limit.",
        )

    mime_type = sniff_mime_type(content, filename)
    return mime_type


def is_scanned_page(text: str) -> bool:
    """Determine if a page should be considered scanned according to FR-3.2.

    Rule: text length < 50 chars or non-alphanumeric ratio > 0.6.
    """
    clean_text = text.strip()
    if len(clean_text) < 50:
        return True

    alphanumeric_count = sum(1 for c in clean_text if c.isalnum())
    non_alphanumeric_ratio = 1.0 - (alphanumeric_count / max(1, len(clean_text)))
    return non_alphanumeric_ratio > 0.6


def preprocess_image_for_ocr(img: Image.Image) -> Image.Image:
    """Deskew, denoise, and enhance image contrast for high-accuracy OCR."""
    # Convert to grayscale
    gray = ImageOps.grayscale(img)
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(1.8)
    return enhanced


def perform_ocr_on_image(img: Image.Image) -> tuple[str, float]:
    """Execute Tesseract OCR and compute average confidence."""
    preprocessed = preprocess_image_for_ocr(img)
    try:
        data = pytesseract.image_to_data(
            preprocessed, output_type=pytesseract.Output.DICT
        )
        confidences = [
            float(c)
            for c, text in zip(data.get("conf", []), data.get("text", []), strict=False)
            if float(c) > 0 and text.strip()
        ]
        text_lines = [t for t in data.get("text", []) if t and str(t).strip()]
        extracted_text = " ".join(text_lines)

        mean_conf = (
            sum(confidences) / (len(confidences) * 100.0) if confidences else 0.5
        )
        return extracted_text.strip(), round(min(1.0, max(0.0, mean_conf)), 3)
    except Exception as e:
        logger.warning("Tesseract OCR exception, trying plain text extraction: %s", e)
        try:
            raw_text = pytesseract.image_to_string(preprocessed)
            return raw_text.strip(), 0.600
        except Exception as fallback_err:
            logger.error("OCR completely failed on image: %s", fallback_err)
            return "", 0.0


def extract_pdf_pages(
    file_bytes: bytes,
) -> tuple[list[ExtractedPage], bool, list[str]]:
    """Extract text from PDF pages with PyMuPDF and OCR fallback for scanned pages."""
    settings = get_settings()
    warnings: list[str] = []

    # Check encryption and page count using pypdf first
    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        if pdf_reader.is_encrypted:
            raise DocumentValidationError(
                code="PDF_ENCRYPTED",
                message="PDF is password-protected. Please upload an unencrypted copy.",
            )
        page_count = len(pdf_reader.pages)
    except DocumentValidationError:
        raise
    except Exception as e:
        raise DocumentValidationError(
            code="CORRUPT_PDF",
            message=f"Could not read PDF document: {e}",
        ) from e

    if page_count > settings.max_pdf_pages:
        raise DocumentValidationError(
            code="PAGE_LIMIT_EXCEEDED",
            message=f"PDF has {page_count} pages, exceeding the maximum allowed ({settings.max_pdf_pages}).",
        )

    # Use PyMuPDF (fitz) for high performance extraction and rasterization
    import pymupdf

    doc: Any = pymupdf.open(stream=file_bytes, filetype="pdf")  # type: ignore[no-untyped-call]
    pages: list[ExtractedPage] = []
    scanned_count = 0

    for idx, page in enumerate(doc, start=1):
        text = page.get_text() or ""
        if is_scanned_page(text):
            scanned_count += 1
            # Rasterize page to image and OCR
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_text, ocr_conf = perform_ocr_on_image(img)

            # Check for low OCR quality warning
            if ocr_conf < 0.60:
                warnings.append(f"LOW_OCR_QUALITY_PAGE_{idx}")

            final_text = ocr_text if len(ocr_text) > len(text) else text
            pages.append(
                ExtractedPage(
                    page_number=idx,
                    text=final_text,
                    extraction_method="ocr",
                    ocr_confidence=ocr_conf,
                    is_scanned=True,
                )
            )
        else:
            pages.append(
                ExtractedPage(
                    page_number=idx,
                    text=text.strip(),
                    extraction_method="text_layer",
                    ocr_confidence=1.0,
                    is_scanned=False,
                )
            )

    doc.close()
    is_overall_scanned = (scanned_count / max(1, page_count)) >= 0.5
    return pages, is_overall_scanned, warnings


def extract_image_document(
    file_bytes: bytes,
) -> tuple[list[ExtractedPage], bool, list[str]]:
    """Extract text from PNG or JPEG using OCR."""
    warnings: list[str] = []
    try:
        img = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise DocumentValidationError(
            code="CORRUPT_IMAGE",
            message=f"Could not read image file: {e}",
        ) from e

    text, conf = perform_ocr_on_image(img)
    if conf < 0.60:
        warnings.append("LOW_OCR_QUALITY_PAGE_1")

    pages = [
        ExtractedPage(
            page_number=1,
            text=text,
            extraction_method="ocr",
            ocr_confidence=conf,
            is_scanned=True,
        )
    ]
    return pages, True, warnings


def inspect_and_extract_document(
    file_bytes: bytes, filename: str
) -> DocumentInspectionResult:
    """Validate, inspect, and extract all pages of document."""
    mime_type = validate_document_bytes(file_bytes, filename)

    if mime_type == "application/pdf":
        pages, is_scanned, warnings = extract_pdf_pages(file_bytes)
    else:
        pages, is_scanned, warnings = extract_image_document(file_bytes)

    return DocumentInspectionResult(
        page_count=len(pages),
        is_scanned=is_scanned,
        pages=pages,
        warnings=warnings,
    )
