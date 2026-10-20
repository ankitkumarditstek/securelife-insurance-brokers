# FRD-02 — Data Storage (Lightweight CRM Data Layer)

Parent: `PRD.md` · This is the foundation: build it first. All other FRDs reference these tables.

## 1. Objective
A structured PostgreSQL database and REST API that stores every lead with a clear status, contact details, qualification scores and full conversation history, plus the documents, extractions and analyses that follow.

## 2. Scope
- Schema and migrations (Alembic), SQLAlchemy 2.x models, repositories, services.
- Lead CRUD / search / filter / status transitions / notes / assignment.
- Dashboard aggregate endpoints.
- Seed script with realistic sample data (for dashboard development).
- Auth tables (simple team users).

## 3. Entity Relationship Overview

```
users 1─* leads (assigned_to)
leads 1─* conversations 1─* messages
leads 1─* lead_status_history
leads 1─* lead_notes
leads 1─* documents 1─1 document_extractions
documents 1─* document_pages
leads 1─* analyses 1─* analysis_findings
(all LLM calls) → llm_call_logs
```

## 4. Table Definitions

Conventions: `id UUID PK DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ` (trigger or ORM onupdate). Soft delete via `deleted_at`.

### 4.1 `users`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | CHECK in (`agent`,`analyst`,`broker`,`admin`) |
| is_active | BOOLEAN | DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | |

### 4.2 `leads`
| Column | Type | Constraints / Notes |
|---|---|---|
| id | UUID | PK |
| full_name | VARCHAR(150) | nullable until captured |
| email | VARCHAR(255) | indexed, nullable |
| phone | VARCHAR(20) | E.164, indexed, nullable |
| preferred_contact_channel | VARCHAR(20) | email/phone/whatsapp |
| source | VARCHAR(30) | `web_chat` (MVP), `whatsapp`, `phone`, `manual` |
| insurance_interest | TEXT[] | e.g. {health,life} |
| has_existing_policy | BOOLEAN | nullable |
| current_provider | VARCHAR(150) | |
| age_range | VARCHAR(10) | |
| location | VARCHAR(150) | |
| household_size | SMALLINT | |
| employment_status | VARCHAR(30) | |
| approx_annual_premium | NUMERIC(14,2) | |
| premium_currency | CHAR(3) | DEFAULT 'INR' (configurable) |
| renewal_timeframe | VARCHAR(10) | |
| main_concern | TEXT | |
| budget_range | VARCHAR(50) | |
| consent_given | BOOLEAN | DEFAULT false |
| consent_at | TIMESTAMPTZ | |
| status | VARCHAR(30) | NOT NULL, CHECK in lifecycle values (PRD §5), DEFAULT `new`, indexed |
| disqualification_reason | VARCHAR(255) | |
| qualification_score | SMALLINT | 0–100 |
| qualification_tier | VARCHAR(10) | hot/warm/cold |
| qualification_breakdown | JSONB | factor → {points, reason} |
| summary | TEXT | AI 2-line summary |
| needs_human | BOOLEAN | DEFAULT false |
| assigned_to | UUID | FK `users.id` NULL |
| captured_data | JSONB | any extra slots not modelled as columns |
| last_activity_at | TIMESTAMPTZ | for sorting |
| deleted_at | TIMESTAMPTZ | soft delete |
| created_at / updated_at | TIMESTAMPTZ | |

Indexes: `(status)`, `(assigned_to)`, `(qualification_score DESC)`, `(created_at DESC)`, `(email)`, `(phone)`, GIN on `captured_data`, trigram/FTS on `full_name`+`email`+`phone` for search.

### 4.3 `lead_status_history`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| lead_id | UUID | FK leads ON DELETE CASCADE, indexed |
| from_status | VARCHAR(30) | nullable for first |
| to_status | VARCHAR(30) | NOT NULL |
| changed_by_user_id | UUID | FK users, NULL if system |
| changed_by_type | VARCHAR(10) | `system` / `user` |
| reason | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | |

### 4.4 `conversations`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| lead_id | UUID | FK leads, indexed |
| session_token | VARCHAR(64) | UNIQUE, indexed |
| channel | VARCHAR(20) | `web_chat` |
| status | VARCHAR(15) | `active`, `complete`, `abandoned`, `ended` |
| state | JSONB | slot state (see FRD-01 §6) |
| turn_count | INT | DEFAULT 0 |
| started_at / ended_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | token expiry (7 days) |

### 4.5 `messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| conversation_id | UUID | FK conversations ON DELETE CASCADE, indexed |
| role | VARCHAR(10) | `user`, `assistant`, `system` |
| content | TEXT | NOT NULL |
| metadata | JSONB | extracted slots, intent, latency_ms, model, error |
| created_at | TIMESTAMPTZ | indexed with conversation_id |

### 4.6 `lead_notes`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| lead_id | UUID | FK leads, indexed |
| author_id | UUID | FK users |
| body | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | |

### 4.7 `documents`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| lead_id | UUID | FK leads, indexed |
| original_filename | VARCHAR(255) | |
| stored_path | VARCHAR(500) | storage key |
| mime_type | VARCHAR(100) | |
| size_bytes | BIGINT | |
| sha256 | CHAR(64) | duplicate detection |
| page_count | INT | |
| doc_type | VARCHAR(30) | `policy`, `claim_history`, `renewal_notice`, `other`, `unknown` |
| is_scanned | BOOLEAN | text-layer absent → OCR used |
| processing_status | VARCHAR(20) | `uploaded`, `queued`, `processing`, `extracted`, `needs_review`, `verified`, `failed` |
| processing_error | TEXT | |
| processing_started_at / processing_finished_at | TIMESTAMPTZ | |
| uploaded_by | VARCHAR(20) | `lead` / `user` |
| deleted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### 4.8 `document_pages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| document_id | UUID | FK documents ON DELETE CASCADE |
| page_number | INT | UNIQUE(document_id, page_number) |
| text | TEXT | extracted/OCR text |
| extraction_method | VARCHAR(15) | `text_layer`, `ocr` |
| ocr_confidence | NUMERIC(4,3) | 0–1 |

### 4.9 `document_extractions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| document_id | UUID | FK documents UNIQUE (latest) |
| lead_id | UUID | FK leads, indexed |
| schema_version | VARCHAR(10) | |
| data | JSONB | structured result (FRD-03 §5) |
| field_confidence | JSONB | field → 0–1 |
| field_evidence | JSONB | field → {page, quote} |
| missing_fields | TEXT[] | |
| overall_confidence | NUMERIC(4,3) | |
| review_status | VARCHAR(15) | `pending`, `verified`, `corrected` |
| reviewed_by | UUID | FK users |
| reviewed_at | TIMESTAMPTZ | |
| corrections | JSONB | audit of manual edits |
| model | VARCHAR(80) | |
| prompt_version | VARCHAR(20) | |
| created_at / updated_at | TIMESTAMPTZ | |

### 4.10 `analyses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| lead_id | UUID | FK leads, indexed |
| version | INT | increments per regeneration |
| status | VARCHAR(15) | `queued`, `running`, `complete`, `failed` |
| executive_summary | TEXT | |
| coverage_summary | JSONB | consolidated coverage view |
| estimated_savings | JSONB | {amount_min, amount_max, currency, basis} |
| risk_score | SMALLINT | 0–100 |
| recommended_action | VARCHAR(30) | enum, see FRD-04 |
| recommendation_rationale | TEXT | |
| confidence | NUMERIC(4,3) | |
| input_snapshot | JSONB | document ids + lead fields used |
| model / prompt_version | VARCHAR | |
| error | TEXT | |
| generated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### 4.11 `analysis_findings`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| analysis_id | UUID | FK analyses ON DELETE CASCADE |
| finding_type | VARCHAR(15) | `gap`, `saving`, `risk`, `opportunity` |
| severity | VARCHAR(10) | `low`,`medium`,`high`,`critical` |
| title | VARCHAR(200) | |
| description | TEXT | |
| evidence | JSONB | [{document_id, page, quote}] |
| estimated_value | NUMERIC(14,2) | nullable (saving or exposure) |
| sort_order | INT | |

### 4.12 `llm_call_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| purpose | VARCHAR(20) | `chat`,`extraction`,`analysis` |
| lead_id | UUID | nullable |
| model | VARCHAR(80) | |
| prompt_version | VARCHAR(20) | |
| input_tokens / output_tokens | INT | |
| latency_ms | INT | |
| success | BOOLEAN | |
| error | TEXT | |
| created_at | TIMESTAMPTZ | |

## 5. Constraints and Integrity Rules
- `leads` must have at least `email` or `phone` before status can become `qualified`.
- Deleting a lead is soft (`deleted_at`); child rows retained. Hard purge via admin script.
- Duplicate leads: on email/phone match with an existing non-deleted lead, reuse the lead (merge new captured data) instead of creating a duplicate.
- Enum-like columns use `CHECK` constraints (easier migration than PG enums).

## 6. Status Transition Rules

| From | Allowed to |
|---|---|
| new | in_conversation, disqualified |
| in_conversation | qualified, disqualified |
| qualified | documents_pending, disqualified, closed_lost |
| documents_pending | documents_processing, closed_lost |
| documents_processing | under_review, documents_pending (on failure) |
| under_review | analysis_complete, documents_pending |
| analysis_complete | closed_won, closed_lost, under_review |
| disqualified | qualified (manual override by broker) |

Invalid transition → HTTP 409 `INVALID_STATUS_TRANSITION`. `LeadService.transition(lead_id, to_status, actor, reason)` is the **only** place status changes (writes history and bumps `last_activity_at`).

## 7. API Specification (CRM)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Returns JWT |
| GET | `/auth/me` | any | Current user |
| GET | `/leads` | any | List with filters |
| GET | `/leads/{id}` | any | Lead detail with embedded summary counts |
| PATCH | `/leads/{id}` | agent+ | Edit profile fields |
| POST | `/leads/{id}/status` | agent+ | Transition `{to_status, reason}` |
| POST | `/leads/{id}/assign` | broker+ | `{user_id}` |
| GET | `/leads/{id}/conversation` | any | Messages ordered ASC |
| GET | `/leads/{id}/history` | any | Status history |
| GET/POST | `/leads/{id}/notes` | any | List / add notes |
| DELETE | `/leads/{id}` | admin | Soft delete |
| GET | `/dashboard/summary` | any | Counts by status, KPIs |
| GET | `/dashboard/pipeline` | any | Leads grouped by stage (for Kanban) |
| GET | `/users` | broker+ | Team members for assignment |

**GET /leads query params:** `status` (multi), `tier`, `q` (search), `assigned_to`, `has_documents`, `created_from`, `created_to`, `sort` (`created_at|-qualification_score|last_activity_at`), `page`, `page_size`.

**GET /leads/{id} response (shape)**
```json
{ "id": "uuid", "full_name": "Ravi Kumar", "email": "…", "phone": "+91…",
  "status": "under_review", "qualification": { "score": 82, "tier": "hot", "breakdown": {} },
  "profile": { "insurance_interest": ["health"], "age_range": "36-45", "location": "Pune" },
  "assigned_to": { "id": "uuid", "full_name": "…" },
  "counts": { "messages": 18, "documents": 2, "analyses": 1 },
  "summary": "…", "needs_human": false,
  "created_at": "…", "last_activity_at": "…" }
```

**GET /dashboard/summary**
```json
{ "totals": { "all": 120, "new": 12, "in_conversation": 9, "qualified": 20,
              "documents_pending": 15, "under_review": 8, "analysis_complete": 40,
              "closed_won": 10, "closed_lost": 6 },
  "avg_hours_to_analysis": 0.4, "conversion_rate": 0.62,
  "hot_leads_waiting": 5, "documents_awaiting_review": 8 }
```

## 8. Implementation Notes
- SQLAlchemy 2.0 typed `Mapped[...]` models; async engine (`asyncpg`/`psycopg`) preferred.
- Repository pattern: routers → services → repositories. No SQL in routers.
- Alembic autogenerate and manual review; first migration `0001_initial_schema`.
- Seed script `python -m app.db.seed` creates 2 users (broker, agent) and ~30 leads across all statuses with messages, 2 sample extractions and 1 analysis.
- `docker-compose.yml`: `postgres`, `backend`, `frontend`.

## 9. Tasks Checklist
- [ ] Docker Compose with Postgres, `.env.example`
- [ ] Models for all tables above; Alembic initial migration
- [ ] Repositories and `LeadService.transition` with transition map and history
- [ ] Auth (login, password hashing, JWT dependency, role guard)
- [ ] Lead list/filter/search endpoints with pagination and indexes
- [ ] Notes, assignment, history, conversation endpoints
- [ ] Dashboard aggregate queries
- [ ] Seed script
- [ ] Pytest: transition rules, dedupe, filters, pagination

## 10. Acceptance Criteria
1. A lead created via chat is retrievable via `GET /leads/{id}` with full conversation.
2. Invalid status transitions return 409 and are not persisted.
3. Filtering by status, tier and search text returns correct pages in < 200 ms for 5k seeded leads.
4. Every status change has a history row.
5. `alembic upgrade head` on an empty DB produces the full schema.
