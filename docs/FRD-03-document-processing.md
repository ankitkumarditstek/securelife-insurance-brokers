# FRD-03 — Document Processing

Parent: `PRD.md` · Depends on: FRD-02 (`documents`, `document_pages`, `document_extractions`, `llm_call_logs`)

## 1. Objective
Let a qualified lead (or staff on their behalf) upload existing insurance documents, then automatically extract structured data — policy type, coverage amounts, premium details, exclusions, renewal dates, provider information and more — handling scanned PDFs, inconsistent formats and missing fields.

## 2. Scope

| In scope | Out of scope (MVP) |
|---|---|
| PDF, PNG, JPG upload (multi-file) | Email-inbox ingestion |
| Text-layer extraction + OCR fallback | Handwriting recognition tuning |
| LLM structured extraction with confidence + evidence | Multi-language documents |
| Human review/correction UI data model | Auto-classification beyond listed doc types |
| Status updates on lead | |

## 3. Processing Pipeline

```
Upload (202) → store file + sha256 → documents.status=uploaded → queue
 1. Validate (type, size, not encrypted, page count ≤ 50)
 2. Text extraction per page (PyMuPDF / pdfplumber)
 3. If page text < N chars or garbled → render page to image → OCR (PaddleOCR / EasyOCR / Tesseract) with preprocessing (deskew, denoise, upscale)
 4. Store page text in document_pages (method, ocr_confidence)
 5. Classify doc_type (LLM, cheap model)
 6. Chunk if long → LLM structured extraction per schema (§5)
 7. Merge chunk results, resolve conflicts, normalise (dates ISO, currency, amounts numeric)
 8. Validate with Pydantic + business rules; compute field confidence; list missing fields
 9. Save document_extractions; documents.status = extracted | needs_review
10. Update lead status → under_review (when all docs done) ; trigger analysis (FRD-04) if configured auto
```

Run in background (`FastAPI BackgroundTasks` for MVP; keep `process_document(document_id)` idempotent so it can move to Celery/RQ). Failures set `failed` with `processing_error`, and a **Retry** endpoint exists.

## 4. Functional Requirements

### FR-3.1 Upload
- Multipart `files[]`, max 5 files per request, ≤ 20 MB each. MIME sniffing (not just extension).
- Reject password-protected PDFs with a clear error code `PDF_ENCRYPTED`.
- Duplicate detection by `sha256` per lead → return existing doc with `duplicate=true`.
- Lead status: `qualified → documents_pending` on first upload; `→ documents_processing` when pipeline starts.
- Access: public upload allowed only with chat `session_token` or signed upload link; staff upload with JWT.

### FR-3.2 Text and OCR
- A page is "scanned" if text length < 50 chars or non-alphanumeric ratio > 0.6.
- OCR only for scanned pages (cost control). Record `ocr_confidence` (mean token confidence).
- Set `documents.is_scanned = true` if ≥ 50% pages OCR'd.
- Low-quality OCR (< 0.6) adds a warning and lowers extraction confidence.

### FR-3.3 Classification
`doc_type` ∈ `policy`, `claim_history`, `renewal_notice`, `premium_receipt`, `other`. If `unknown` extraction still runs with generic schema.

### FR-3.4 LLM Extraction
- Structured output matching `ExtractionResult` (§5). Prompt rules: never guess, use `null` for missing, give `evidence` (page and ≤ 200-char quote) for each key field, normalise dates to `YYYY-MM-DD`, amounts to numbers with currency code.
- Long docs: split by page groups (≈ 6 pages) → extract per chunk → merge (prefer higher-confidence, flag conflicts).
- One repair retry on schema failure. Temperature 0.
- Log each call in `llm_call_logs`.

### FR-3.5 Confidence and review
- Field confidence = f(LLM self-reported confidence, evidence found in text (string match check), OCR confidence).
- `overall_confidence` = weighted mean of core fields.
- `review_status`: if `overall_confidence` < 0.75 or any core field missing → `needs_review`, else `pending` (still reviewable).
- Analyst may edit fields; edits stored in `corrections` (`{field, old, new, by, at}`) and set `review_status=corrected`; **Verify** sets `verified`.

### FR-3.6 Multiple documents per lead
Each document has its own extraction. A lead-level "consolidated coverage view" is built in FRD-04 from all verified/extracted documents.

### FR-3.7 Error handling

| Error | Behaviour |
|---|---|
| Unsupported type / too large | 422 with code, no DB row |
| Corrupt PDF | status `failed`, message "Could not read file" |
| OCR engine failure | retry once, then `failed` |
| LLM timeout / invalid JSON | retry (backoff ×2), then `failed`, retry endpoint |
| Non-insurance document | doc_type `other`, warning `NOT_INSURANCE_DOCUMENT`, low confidence |

## 5. Extraction Schema (`schema_version: "1.0"`)

```json
{
  "doc_type": "policy",
  "provider": { "name": "", "address": null, "contact": null, "irdai_or_license_no": null },
  "policy": {
    "policy_number": null,
    "policy_type": "health|life|motor|home|travel|business|other",
    "plan_name": null,
    "status": "active|lapsed|unknown",
    "start_date": null, "end_date": null, "renewal_date": null,
    "policy_holder": { "name": null, "dob": null, "address": null },
    "insured_members": [{ "name": null, "relationship": null, "age": null }],
    "nominees": [{ "name": null, "relationship": null }]
  },
  "coverage": {
    "sum_insured": { "amount": null, "currency": null },
    "coverage_items": [
      { "name": "Hospitalisation", "limit": 500000, "sub_limit_notes": null, "waiting_period_months": null }
    ],
    "deductible_or_copay": { "deductible": null, "copay_percent": null },
    "riders_addons": [{ "name": null, "amount": null }],
    "network_or_geography": null
  },
  "premium": {
    "amount": null, "currency": null,
    "frequency": "annual|semi_annual|quarterly|monthly|single|unknown",
    "taxes": null, "total_payable": null,
    "payment_mode": null, "next_due_date": null
  },
  "exclusions": [{ "description": "", "category": null }],
  "waiting_periods": [{ "item": "", "months": 0 }],
  "claims_history": [
    { "claim_id": null, "date": null, "type": null, "amount_claimed": null,
      "amount_settled": null, "status": "settled|rejected|pending|unknown", "reason": null }
  ],
  "no_claim_bonus": { "percent": null, "accumulated_amount": null },
  "other_notes": [],
  "field_confidence": { "policy.policy_number": 0.96 },
  "field_evidence": { "policy.policy_number": { "page": 1, "quote": "Policy No: …" } },
  "missing_fields": ["premium.taxes"],
  "warnings": ["LOW_OCR_QUALITY_PAGE_3"]
}
```

**Core fields** (drive overall confidence): `provider.name`, `policy.policy_type`, `policy.policy_number`, `policy.end_date/renewal_date`, `coverage.sum_insured`, `premium.amount`, `premium.frequency`, `exclusions`.

## 6. API Specification

| Method | Path | Description |
|---|---|---|
| POST | `/leads/{lead_id}/documents` | Multipart upload → 202 with document list |
| POST | `/documents/upload` | Public upload with `session_token` header (chat flow) |
| GET | `/leads/{lead_id}/documents` | List with status |
| GET | `/documents/{id}` | Metadata and processing state |
| GET | `/documents/{id}/file` | Signed/streamed download (JWT) |
| GET | `/documents/{id}/extraction` | Extraction data, confidence, evidence |
| PATCH | `/documents/{id}/extraction` | Corrections `{ "changes": [{"path":"premium.amount","value":12000}] }` |
| POST | `/documents/{id}/extraction/verify` | Mark verified |
| POST | `/documents/{id}/reprocess` | Re-run pipeline (retry or new prompt) |
| DELETE | `/documents/{id}` | Soft delete |

**POST upload → 202**
```json
{ "documents": [ { "id": "uuid", "original_filename": "policy.pdf",
   "processing_status": "queued", "duplicate": false } ] }
```
Clients poll `GET /documents/{id}` (every 2–3 s) until terminal state.

## 7. Frontend Requirements

**`documentsSlice` state**
```ts
interface DocumentsState {
  byLeadId: Record<string, DocumentSummary[]>;
  uploads: Record<string, { fileName: string; progress: number; status: 'uploading'|'queued'|'error'; error?: string }>;
  selectedDocumentId: string | null;
  extractions: Record<string, ExtractionResult>;
  loading: boolean; error: string | null;
}
```
**Sagas**
- `uploadDocumentsSaga`: use `eventChannel` over axios `onUploadProgress`, dispatch progress, on success start polling.
- `pollDocumentStatusSaga`: `race` between polling loop (`delay(2500)`) and `cancel`/terminal status; stops on `extracted|needs_review|failed`.
- `fetchExtractionSaga`, `saveCorrectionsSaga`, `verifyExtractionSaga`, `reprocessSaga`.

**Components:** `DocumentUploader` (drag-drop, multi-file, type/size validation, progress bars), `DocumentList` (status badge, retry), `ProcessingStepper` (Uploaded → Reading → Extracting → Ready), `ExtractionViewer` (grouped sections: Provider, Policy, Coverage, Premium, Exclusions, Claims), `ConfidenceBadge`, `EvidencePopover` (page + quote), `FieldEditor` (inline edit with validation), `PdfPreviewPane` (side-by-side with data), `MissingFieldsAlert`.

**UX details:** low-confidence fields highlighted amber; missing fields shown as "Not found in document"; verified state shown with a check and reviewer name.

## 8. Non-Functional
- 10-page text PDF processed < 60 s; 10-page scanned < 3 min.
- Idempotent re-processing (replace page and extraction rows in a transaction).
- Files never served without auth/signature; no document text in logs.
- Sample set: ship 5 test PDFs (clean, scanned, multi-policy, missing fields, non-insurance) in `backend/sample_data/`.

## 9. Tasks Checklist

**Backend**
- [ ] `StorageBackend` interface + local implementation
- [ ] Upload endpoints, validation, sha256 dedupe
- [ ] Text extraction (PyMuPDF), scanned-page detection, OCR with preprocessing
- [ ] Pydantic `ExtractionResult` + prompts `extract_v1.md`, `classify_v1.md`
- [ ] Chunk/merge logic, normalisers (dates, amounts), confidence calculation
- [ ] Background task runner, retries, status updates + lead status sync
- [ ] Extraction read/correct/verify endpoints
- [ ] Tests with sample PDFs; golden JSON fixtures for regression

**Frontend**
- [ ] Uploader, progress and polling sagas
- [ ] Extraction viewer with confidence and evidence
- [ ] Inline correction and verify flow

## 10. Acceptance Criteria
1. Uploading a sample policy PDF yields a populated `document_extractions` row linked to the lead.
2. A scanned PDF is OCR'd and still yields core fields (with lower confidence flags if poor).
3. Missing fields are `null` and listed in `missing_fields`, never fabricated.
4. Failure cases (corrupt/encrypted/non-insurance) produce clear states and a working retry.
5. Analyst can correct a field and verify; correction audit is stored.
6. Lead status moves `documents_pending → documents_processing → under_review` automatically.
