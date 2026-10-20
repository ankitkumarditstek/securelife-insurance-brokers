# FRD-01 — Lead Capture Chatbot

Parent: `PRD.md` · Depends on: FRD-02 (tables `leads`, `conversations`, `messages`)

## 1. Objective
A natural-feeling conversational interface that qualifies prospects and produces structured lead data. It must handle vague answers, incomplete information and clarifications gracefully, and end with a stored, scored lead.

## 2. Scope

| In scope | Out of scope (MVP) |
|---|---|
| Web chat widget (public page `/chat`) | WhatsApp / phone channels (design leaves adapter seam) |
| LLM-driven dialogue with slot-filling | Voice |
| Qualification scoring and status transition | Human live-agent handoff UI (flag only) |
| Streaming responses (SSE) | Multi-language (English only) |
| Document upload prompt after qualification | |

## 3. Data to Capture (Slots)

| Slot key | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string | Yes | |
| `email` | string (email) | One of email/phone | Validated |
| `phone` | string (E.164 normalised) | One of email/phone | Validated |
| `preferred_contact_channel` | enum: email, phone, whatsapp | No | |
| `insurance_interest` | enum: life, health, motor, home, travel, business, other | Yes | Can be multi-select |
| `has_existing_policy` | boolean | Yes | Drives document upload step |
| `current_provider` | string | If has policy | |
| `age_range` | enum: 18-25, 26-35, 36-45, 46-55, 56-65, 65+ | Yes | |
| `location` | string (city/region) | Yes | |
| `household_size` / `dependents` | int | No | |
| `employment_status` | enum | No | |
| `approx_annual_premium` | numeric + currency | No | |
| `renewal_timeframe` | enum: <1m, 1-3m, 3-6m, 6m+, unknown | No | Urgency signal |
| `main_concern` | free text | No | Why they are looking |
| `budget_range` | enum / free text | No | |
| `consent_given` | boolean | Yes | Must be true before storing PII |

## 4. Functional Requirements

### FR-1.1 Session start
- Frontend calls `POST /chat/sessions`. Backend creates `leads` row (status `new`), `conversations` row, and returns `session_token`, `conversation_id` and a greeting message.
- Greeting includes a brief consent line ("I'll store what you share to help a broker follow up").

### FR-1.2 Turn handling
For each user message:
1. Persist user message.
2. Load conversation state (`conversations.state` JSONB: filled slots, per-slot confidence, current goal, turn count, clarification counters).
3. Call the LLM with system prompt + state + recent messages, requesting **structured output**:

```json
{
  "reply": "string shown to user",
  "extracted_slots": { "slot_key": { "value": "...", "confidence": 0.0 } },
  "intent": "answer | question | smalltalk | refusal | out_of_scope | handoff_request | done",
  "needs_clarification": { "slot_key": "reason" },
  "next_slot_to_ask": "slot_key | null"
}
```

4. Validate and normalise slots (see FR-1.4), merge into state, update `leads` columns.
5. Persist assistant message with metadata (extracted slots, intent, latency, model).
6. Recompute completeness and qualification score. Stream reply to client.

### FR-1.3 Conversation behaviour
- Ask **one** question at a time (two at most if closely related); acknowledge the previous answer.
- Do not re-ask slots already filled with confidence ≥ 0.7.
- Accept multiple slots in one message ("I'm Ravi, 34, in Pune, need health cover").
- Tone: warm, concise, professional; no insurance jargon unless user uses it.
- Never give binding quotes or definitive advice; may answer simple general questions then steer back.

### FR-1.4 Edge case handling

| Case | Required behaviour |
|---|---|
| Vague answer ("a while ago", "not sure") | Offer 2–3 concrete options or a range; if still unknown after 2 attempts, store `unknown` and move on |
| Incomplete info (name only) | Ask for missing contact method politely |
| Invalid email/phone | Re-ask once with example format; do not store invalid value |
| Contradiction (age changes) | Confirm: "Earlier you said 34 — should I update to 43?" |
| User asks a question mid-flow | Answer briefly (or say a broker will cover it), then return to pending slot |
| User refuses to share a slot | Mark `declined`, never ask again; continue |
| Off-topic / abusive | One polite redirect; after 3 strikes end chat politely, flag lead |
| Prompt injection ("ignore instructions") | Ignore, stay in role, log `guardrail_triggered` |
| Asks for human | Set `needs_human=true`, capture contact, confirm follow-up |
| Long silence / returns later | Session resumable by `session_token` for 7 days |
| Multiple topics / multi-policy | Capture as list in `insurance_interest` |
| Non-English fragments | Respond in English, politely note English-only |

### FR-1.5 Slot validation (code, not LLM)
- Email: RFC-lite regex + domain check. Phone: `phonenumbers` library, default region configurable.
- Enums mapped via synonym dictionary (e.g. "medical" → `health`).
- Age numbers mapped to `age_range`.

### FR-1.6 Completion criteria
Conversation is **complete** when: `consent_given`, `full_name`, (`email` or `phone`), `insurance_interest`, `has_existing_policy`, `age_range`, `location` are filled or explicitly declined/unknown after max attempts — or turn count > 25.

On completion:
- Compute qualification score (FR-1.7), store breakdown.
- Status → `qualified` or `disqualified` (threshold from `QUALIFICATION_THRESHOLD`).
- If qualified and `has_existing_policy`: reply includes upload prompt and the frontend shows an upload card; status → `documents_pending` once the first upload begins (or immediately if configured).
- If disqualified: friendly closing message; lead stays visible on dashboard with reason.

### FR-1.7 Qualification scoring (rule-based, deterministic)

| Factor | Points | Rule |
|---|---|---|
| Contact completeness | 0–20 | email+phone 20, one 12, none 0 |
| Insurance interest in supported lines | 0–20 | supported 20, other 5 |
| Has existing policy (documents available) | 0–20 | yes 20, no 8 |
| Renewal urgency | 0–15 | <1m 15, 1–3m 12, 3–6m 7, 6m+ 3, unknown 4 |
| Location in service area | 0–10 | configurable list |
| Budget / premium indicates meaningful size | 0–10 | tiers configurable |
| Engagement quality (answers given, not declined) | 0–5 | ratio of answered slots |

Tier: `hot` ≥ 75, `warm` 50–74, `cold` < 50. Store `qualification_score`, `qualification_tier`, `qualification_breakdown` (JSONB with each factor and reason). An optional LLM "qualification summary" (2 lines) is stored in `leads.summary`.

### FR-1.8 Resumption
`GET /chat/sessions/{session_token}` returns message history and filled slots so the widget can resume.

## 4a. LLM Design

- **Orchestration:** single structured-output call per turn (MVP). LangGraph and Lanchain should be used; keep logic in `chat_service.py` with explicit nodes: `load_state → llm_turn → validate_slots → update_state → score → persist`.
- **System prompt sections:** role and tone, slot list with descriptions and enum values, rules (one question at a time, never invent values, mark confidence), guardrails, current state JSON, "next best slot" hint chosen by code (priority order: consent → name → interest → has_policy → age → location → contact → renewal → concern).
- **Confidence rule:** values with confidence < 0.6 are not stored; the bot asks a clarifying question instead.
- **Fallback:** on LLM failure/timeout (10 s) return a generic apology plus a retry hint; persist an error event; never lose the user message.

## 5. API Specification

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat/sessions` | public | Create session, returns greeting |
| POST | `/chat/sessions/{token}/messages` | public (token) | Send message; returns assistant reply |
| GET | `/chat/sessions/{token}/stream?message_id=` | public (token) | SSE stream of reply tokens (optional) |
| GET | `/chat/sessions/{token}` | public (token) | Resume: messages and state |
| POST | `/chat/sessions/{token}/end` | public (token) | Mark conversation ended |

**POST /chat/sessions → 201**
```json
{ "session_token": "str", "conversation_id": "uuid", "lead_id": "uuid",
  "messages": [{ "id": "uuid", "role": "assistant", "content": "Hi! …", "created_at": "…" }] }
```

**POST /chat/sessions/{token}/messages**
Request `{ "content": "I'm Ravi, need health insurance" }`
Response
```json
{ "message": { "id": "uuid", "role": "assistant", "content": "Nice to meet you, Ravi! …" },
  "captured": { "full_name": "Ravi", "insurance_interest": ["health"] },
  "conversation_status": "active | complete",
  "lead_status": "in_conversation",
  "ui_actions": [{ "type": "show_upload", "lead_id": "uuid" }] }
```
Rate limit: 20 messages/min per session; max message length 2000 chars.

## 6. Data Model (owned in FRD-02; fields used here)

| Table | Used columns |
|---|---|
| `leads` | all profile columns, `status`, `qualification_*`, `needs_human` |
| `conversations` | `id`, `lead_id`, `session_token`, `state` (JSONB), `status`, `turn_count`, `started_at`, `ended_at` |
| `messages` | `id`, `conversation_id`, `role`, `content`, `metadata` (JSONB), `created_at` |

`conversations.state` shape:
```json
{ "slots": { "full_name": { "value": "Ravi", "confidence": 0.95, "status": "filled" } },
  "declined": ["budget_range"], "attempts": { "renewal_timeframe": 2 },
  "guardrail_strikes": 0, "last_asked_slot": "age_range" }
```

## 7. Frontend Requirements (chat feature)

**Redux slice `chatSlice`** state:
```ts
interface ChatState {
  sessionToken: string | null;
  leadId: string | null;
  messages: ChatMessage[];          // {id, role, content, createdAt, status: 'sent'|'pending'|'error'}
  isAssistantTyping: boolean;
  conversationStatus: 'idle'|'active'|'complete'|'error';
  uiAction: { type: 'show_upload'; leadId: string } | null;
  error: string | null;
}
```
**Actions:** `startSession`, `startSessionSuccess/Failure`, `sendMessage`, `sendMessageSuccess/Failure`, `appendAssistantChunk`, `resumeSession`, `retryLastMessage`, `reset`.

**Sagas (`chatSagas.ts`):**
- `watchStartSession` — `takeLatest`: call API, store token in `localStorage`.
- `watchSendMessage` — `takeEvery`: optimistic add of user message, set typing, call API, handle success/failure; on failure mark message `error` with retry.
- `watchResumeSession` — on app load if token exists.
- SSE streaming variant uses an `eventChannel`.

**Components:** `ChatWindow`, `MessageBubble`, `TypingIndicator`, `ChatInput` (Enter to send, disabled while pending), `QuickReplyChips` (for enum slots), `ConsentBanner`, `UploadPromptCard` (links to FRD-03 uploader), `ChatErrorBanner`.

**UX:** auto-scroll, markdown-lite rendering, mobile responsive, accessible (aria-live for new messages), visible "Talk to a human" button.

## 8. Non-Functional
- p95 reply latency < 4 s (first token < 1.5 s with streaming).
- Conversation persisted after every turn (no loss on refresh).
- No PII in logs; prompts versioned (`chat_v1.md`).

## 9. Tasks Checklist

**Backend**
- [ ] Pydantic schemas for slots, turn output, API contracts
- [ ] `LLMClient` wrapper with structured output + retry
- [ ] `chat_service` (state machine) and slot validators/normalisers
- [ ] `qualification.py` with unit tests per factor
- [ ] Chat router, rate limiting, session token generation
- [ ] Guardrail tests (injection, abuse, off-topic)

**Frontend**
- [ ] `chatSlice`, `chatSagas`, typed hooks
- [ ] Chat UI components, resume logic, error and retry states
- [ ] Upload prompt integration

**Testing / Acceptance**
1. Scripted conversation fills all required slots and creates a scored lead.
2. Vague answer path ("sometime next year") stores a sensible range or `unknown` after 2 attempts.
3. Invalid email rejected and re-asked once.
4. Page refresh resumes the same conversation.
5. Disqualified path ends politely and appears on dashboard with reason.
6. Prompt-injection attempt is ignored and logged.

## 10. Sample Conversation (for test fixtures)

```
Bot: Hi! I'm SecureLife's assistant. I can help figure out the right insurance for you. I'll save what you share so a broker can follow up — is that okay?
User: yes sure
Bot: Great. What's your name?
User: Ravi, looking at health stuff for my family
Bot: Nice to meet you, Ravi. Health cover for the family — how many people would it cover, roughly?
User: me wife and 2 kids
Bot: Got it, four of you. Do you currently have a health policy?
User: yeah from some company through work
Bot: Is that group cover from your employer only, or do you have a separate personal policy as well?
...
```
