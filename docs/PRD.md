# SecureLife AI Lead Pipeline — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | SecureLife Intelligent Lead Pipeline (MVP) |
| Version | 0.1 (MVP) |
| Status | Draft |
| Stack (Frontend) | React, TypeScript, Redux Toolkit, Redux-Saga, Tailwind CSS |
| Stack (Backend) | Python, FastAPI, SQLAlchemy, Alembic, Pydantic v2 |
| Database | PostgreSQL 15+ |
| LLM | Provider-agnostic (default: GROQ, using API key) |

## Document Map (read in this order)

| # | Document | Purpose |
|---|---|---|
| 0 | `PRD.md` (this file) | Whole-project vision, scope, architecture, shared standards |
| 1 | `FRD-01-lead-capture-chatbot.md` | Conversational lead capture |
| 2 | `FRD-02-data-storage.md` | Database schema, CRM data layer, core APIs |
| 3 | `FRD-03-document-processing.md` | Upload, OCR, LLM extraction |
| 4 | `FRD-04-intelligent-analysis.md` | Gaps, savings, risks, recommendation |
| 5 | `FRD-05-dashboard.md` | Pipeline UI and lead detail views |

**Suggested build order:** FRD-02 (schema first) → FRD-01 → FRD-03 → FRD-04 → FRD-05 (the dashboard can be built in parallel with mock data once FRD-02 APIs are stubbed).

---

## 1. Background and Problem Statement

SecureLife handles new client inquiries manually. A prospect reaches out via website, WhatsApp or phone. A sales agent collects details, asks qualifying questions and types them into a spreadsheet. Interested prospects email their existing insurance documents (policy PDFs, claim histories). An analyst reads them, extracts data points and writes a summary for the senior broker.

**Pain points**

| Problem | Impact |
|---|---|
| 2–3 days per lead | Prospects go to faster competitors |
| Manual extraction | Error-prone, inconsistent |
| No early filtering | Senior broker wastes time on unqualified leads |
| No central pipeline view | No visibility into lead status or workload |

## 2. Goals and Non-Goals

### Goals
1. Reduce lead-to-broker-ready-summary time from 2–3 days to under 15 minutes after document upload.
2. Capture structured lead data through a natural conversation, not a rigid form.
3. Store all lead data, conversations, documents and analyses in one structured CRM.
4. Extract structured data from real-world (including scanned) insurance PDFs using an LLM.
5. Generate an insight-rich analysis (gaps, savings, risk flags, recommended action).
6. Give the SecureLife team a polished dashboard of the full pipeline.

### Non-Goals (MVP)
- Real WhatsApp / telephony integration (the MVP chatbot is a web chat widget; channel adapters are a later phase).
- Payment, quoting engine or policy issuance.
- Multi-tenant SaaS, billing, SSO.
- Fine-tuned models; MVP uses prompting plus structured output.
- Complete role-based access control (MVP has simple login with `agent` and `broker` roles).

## 3. Users and Personas

| Persona | Description | Primary needs |
|---|---|---|
| Prospect | Potential client chatting on the website | Fast, natural, low-friction conversation; easy document upload |
| Sales Agent | Monitors incoming leads | See new leads, conversation transcripts, follow up |
| Analyst | Reviews document extraction | Verify and correct extracted fields |
| Senior Broker | Makes the final call | Concise analysis, qualification score, recommendation |

## 4. End-to-End User Journey

```
Prospect opens chat → Chatbot qualifies → Lead created (status: in_conversation)
   → Qualification score computed → status: qualified | disqualified
   → Qualified lead gets upload link → uploads policy PDFs (status: documents_pending)
   → Document pipeline: text/OCR → LLM extraction → validation (status: documents_processing → under_review)
   → Analyst can verify/correct fields
   → Analysis generated: gaps, savings, risks, recommended action (status: analysis_complete)
   → Broker reviews on dashboard → closed_won | closed_lost
```

## 5. Lead Status Lifecycle (shared by all modules)

| Status | Meaning | Set by |
|---|---|---|
| `new` | Lead record created, no messages yet | Chat module |
| `in_conversation` | Chat in progress | Chat module |
| `qualified` | Score ≥ threshold, ready for documents | Chat module |
| `disqualified` | Score below threshold or explicit out-of-scope | Chat module |
| `documents_pending` | Awaiting uploads | Document module |
| `documents_processing` | Extraction running | Document module |
| `under_review` | Extraction done, awaiting human verification | Document module |
| `analysis_complete` | Analysis generated | Analysis module |
| `closed_won` | Converted | Broker (dashboard) |
| `closed_lost` | Lost or declined | Broker (dashboard) |

Allowed transitions are enforced in the service layer (see FRD-02 §6). Every transition writes a row to `lead_status_history`.

## 6. Scope: Five Modules

| Module | Summary | FRD |
|---|---|---|
| M1 Lead Capture | LLM chatbot with slot-filling, edge-case handling, qualification scoring | FRD-01 |
| M2 Data Storage | PostgreSQL schema, repositories, REST API for leads | FRD-02 |
| M3 Document Processing | Upload, text extraction/OCR, LLM structured extraction, confidence | FRD-03 |
| M4 Intelligent Analysis | Coverage gaps, savings, risk flags, recommended action | FRD-04 |
| M5 Dashboard | Pipeline Kanban/table, lead detail timeline, upload and review UI | FRD-05 |

## 7. System Architecture

```
┌──────────────────────── Frontend (React + TS) ─────────────────────────┐
│  Chat Widget │ Dashboard │ Lead Detail │ Document Review               │
│  Redux Toolkit slices ◄── Redux-Saga (API side effects, polling, SSE)  │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ REST (JSON) + SSE (chat streaming)
┌───────────────────────────────▼────────────────────────────────────────┐
│ FastAPI                                                                │
│  routers/  chat · leads · documents · analyses · auth · dashboard      │
│  services/ chat_service · lead_service · document_service · analysis…  │
│  llm/      client · prompts · schemas (Pydantic structured output)     │
│  workers/  BackgroundTasks (MVP) → Celery/RQ (later)                   │
│  repositories/ SQLAlchemy                                              │
└───────────────┬───────────────────────┬────────────────────────────────┘
                │                       │
        PostgreSQL 15            File storage (local ./storage in MVP,
        (JSONB used for          S3-compatible interface behind
        flexible extracted data)  a StorageBackend abstraction)
                                │
                          LLM provider API   +   OCR engine
```

### 7.1 Backend project structure

```
backend/
  app/
    main.py
    core/            config.py, security.py, logging.py, errors.py
    db/              base.py, session.py, models/*.py
    schemas/         pydantic request/response models
    repositories/    lead_repo.py, conversation_repo.py, document_repo.py, analysis_repo.py
    services/        chat_service.py, lead_service.py, qualification.py,
                     document_service.py, extraction_service.py, analysis_service.py
    llm/             client.py, prompts/, structured_schemas.py
    api/v1/          chat.py, leads.py, documents.py, analyses.py, auth.py, dashboard.py
    workers/         tasks.py
    storage/         base.py, local.py
  alembic/
  tests/
  sample_data/       sample insurance PDFs
```

### 7.2 Frontend project structure

```
frontend/src/
  app/               store.ts, rootSaga.ts, hooks.ts
  api/               httpClient.ts (axios), endpoints.ts
  features/
    chat/            chatSlice.ts, chatSagas.ts, components/
    leads/           leadsSlice.ts, leadsSagas.ts, components/
    documents/       documentsSlice.ts, documentsSagas.ts, components/
    analysis/        analysisSlice.ts, analysisSagas.ts, components/
    dashboard/       dashboardSlice.ts, dashboardSagas.ts, components/
    auth/
  components/ui/     Button, Badge, Card, Table, Modal, Skeleton, EmptyState…
  pages/             DashboardPage, LeadsPage, LeadDetailPage, ChatPage, LoginPage
  types/             domain.ts (mirrors backend schemas)
  utils/
```

## 8. Shared Technical Standards

### 8.1 API conventions
- Base path `/api/v1`. JSON only (except multipart upload and SSE).
- IDs are UUID v4. Timestamps are ISO-8601 UTC.
- Pagination: `?page=1&page_size=20` → `{ items, total, page, page_size }`.
- Error envelope:

```json
{ "error": { "code": "LEAD_NOT_FOUND", "message": "Lead not found", "details": {} } }
```

| HTTP | Used for |
|---|---|
| 200/201 | Success / created |
| 202 | Accepted for async processing (document upload) |
| 400 / 422 | Validation errors |
| 401 / 403 | Auth errors |
| 404 | Not found |
| 409 | Invalid status transition / duplicate |
| 429 | Rate limit |
| 502 | Upstream LLM failure |

### 8.2 Auth (MVP)
- JWT bearer for dashboard endpoints. Chat endpoints are public but rate-limited and scoped by an unguessable `session_token`.
- Roles: `agent`, `analyst`, `broker`, `admin`.

### 8.3 LLM usage standards
- All LLM outputs that feed the database use **structured output** validated by Pydantic. Invalid output triggers one repair retry, then a graceful failure state.
- Every LLM call logs: model, prompt version, latency, token counts, request id (table `llm_call_logs`, see FRD-02).
- Temperature 0–0.2 for extraction and analysis, ~0.5 for chat.
- Prompts are versioned files under `llm/prompts/`.
- PII is never written to application logs.

### 8.4 Security and privacy
- Insurance documents are sensitive. Uploads are restricted by type (PDF, PNG, JPG) and size (≤ 20 MB). Files are stored outside the web root with random names. Signed, expiring download URLs.
- Chat consent notice shown before data capture. Lead data deletion endpoint (soft delete) for data-subject requests.
- Secrets via environment variables; `.env.example` provided.

### 8.5 Observability
- Structured JSON logs with `request_id`. `/health` and `/ready` endpoints.
- Pipeline stage timings stored per document.

### 8.6 Environment variables

| Name | Example |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:pass@localhost:5432/securelife` |
| `LLM_PROVIDER` | `anthropic` |
| `LLM_API_KEY` | — |
| `LLM_CHAT_MODEL` / `LLM_EXTRACT_MODEL` | provider model names |
| `STORAGE_PATH` | `./storage` |
| `JWT_SECRET` | — |
| `QUALIFICATION_THRESHOLD` | `50` |
| `MAX_UPLOAD_MB` | `20` |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` |

## 9. Success Metrics

| Metric | MVP target |
|---|---|
| Chat → structured lead success rate | ≥ 90% of completed chats yield valid required fields |
| Extraction field accuracy (on sample set) | ≥ 85% for core fields |
| Time from upload to analysis | < 3 min for a 10-page PDF |
| Dashboard load time | < 2 s for 500 leads |
| Broker time per lead review | Reduced from hours to < 10 min (qualitative) |

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LLM hallucinated values | Field-level confidence, source quote/page evidence, human verify step |
| Scanned PDFs poor quality | OCR fallback, image preprocessing, low-confidence flagging |
| Chat drifts or leaks | System prompt guardrails, slot-based state machine owns flow, max turn limit |
| Insurance advice liability | Analysis labeled "decision support for a licensed broker", never sent to prospects |
| LLM latency / outage | Background processing, retries with backoff, clear failed state with retry button |
| PII exposure | Access control, redacted logs, signed URLs |

## 11. MVP Acceptance Criteria (whole system)

1. A real conversation in the chat widget produces a lead row with contact details, captured fields, score and full message history.
2. Uploading a sample insurance PDF produces a stored extraction linked to that lead.
3. An analysis is generated and stored with gaps, savings, risk flags and a recommended action.
4. The dashboard shows leads by status, with a lead detail page showing conversation, documents, extracted data and analysis.
5. UI is polished: consistent design system, loading/empty/error states, responsive layout.

## 12. Phasing

| Phase | Scope |
|---|---|
| MVP (this doc set) | Web chat, CRM, PDF extraction, analysis, dashboard |
| Phase 2 | WhatsApp (Twilio/Meta Cloud API) and voice channel adapters, email ingestion of documents |
| Phase 3 | Quote comparison, e-signature, analytics, multi-tenant |

## 13. Glossary

| Term | Meaning |
|---|---|
| Lead | A prospective client record |
| Slot | A single piece of data the chatbot aims to capture |
| Qualification score | 0–100 fit score used to filter leads |
| Extraction | Structured data pulled from a document |
| Coverage gap | Risk the lead is exposed to that current policies do not cover |
