# FRD-04 — Intelligent Analysis

Parent: `PRD.md` · Depends on: FRD-01 (lead profile), FRD-02 (`analyses`, `analysis_findings`), FRD-03 (`document_extractions`)

## 1. Objective
Turn extracted document data plus the lead's profile into broker-ready insight: **coverage gaps, potential savings, risk flags and a recommended action**, each backed by evidence. This is decision support for a licensed broker, not advice sent to the prospect.

## 2. Scope

| In scope | Out of scope (MVP) |
|---|---|
| Single-lead analysis from all extracted docs | Live market quote comparison |
| Gap / saving / risk findings with evidence | Actuarial pricing models |
| Recommended action and rationale | Auto-emailing prospects |
| Regeneration and versioning | Learning from outcomes |

## 3. Inputs

| Source | Fields used |
|---|---|
| `leads` | age_range, location, household_size, insurance_interest, main_concern, budget_range, renewal_timeframe, approx_annual_premium, qualification_score |
| `document_extractions` | all extraction data (verified/corrected values take precedence), confidence, missing_fields |
| Reference data (config files) | `benchmarks.yaml`: typical sum insured per age/household/line, standard exclusions of concern, typical premium bands, regulatory notes |

Analysis is triggered: (a) automatically when all documents for a lead reach `extracted/needs_review/verified` and at least one has overall confidence ≥ 0.5; (b) manually via **Generate/Regenerate Analysis**.

## 4. Functional Requirements

### FR-4.1 Consolidation (deterministic code first)
Build a `ConsolidatedCoverage` object before calling the LLM:
- Merge multiple policies by line (health, life, motor…).
- Total sum insured per line, total annual premium (normalise frequency → annual), nearest renewal date, providers list, combined exclusions, claims count and settlement ratio.
- Flag data quality: low-confidence fields, missing core fields, unverified docs.

### FR-4.2 Rule-based checks (deterministic, auditable)

| Rule id | Check | Output |
|---|---|---|
| `R-RENEW-30` | Renewal within 30 days | risk (high) |
| `R-RENEW-LAPSED` | End date in the past / status lapsed | risk (critical) |
| `R-SI-LOW` | Sum insured < benchmark × 0.6 for profile | gap (high) |
| `R-NO-RIDER` | No critical-illness / top-up for health with dependants | gap (medium) |
| `R-COPAY-HIGH` | Co-pay > 20% | risk (medium) |
| `R-WAIT-LONG` | Waiting period > 36 months for key item | risk (medium) |
| `R-CLAIM-REJECT` | Rejected claims ratio > 30% | risk (high) |
| `R-PREM-HIGH` | Annual premium > benchmark band upper bound | saving (medium) |
| `R-DUP-COVER` | Overlapping policies on same line | saving (medium) |
| `R-DATA-LOW` | Core fields missing/low confidence | risk (data quality) |

Each rule returns `{rule_id, finding_type, severity, evidence[], estimated_value?}`.

### FR-4.3 LLM analysis
Input: lead profile, `ConsolidatedCoverage`, rule findings, benchmark excerpts. Output (structured, Pydantic):

```json
{
  "executive_summary": "3–5 sentences for the broker",
  "coverage_summary": { "health": { "sum_insured": 500000, "premium_annual": 18000, "providers": ["…"] } },
  "findings": [
    { "finding_type": "gap|saving|risk|opportunity",
      "severity": "low|medium|high|critical",
      "title": "Sum insured below recommended for family of 4",
      "description": "…",
      "evidence": [{ "document_id": "uuid", "page": 2, "quote": "…" }],
      "estimated_value": null,
      "source": "rule:R-SI-LOW | llm" }
  ],
  "estimated_savings": { "amount_min": 3000, "amount_max": 6000, "currency": "INR", "basis": "…assumptions…" },
  "risk_score": 0,
  "recommended_action": "…",
  "recommendation_rationale": "…",
  "suggested_talking_points": ["…"],
  "questions_for_client": ["…"],
  "confidence": 0.0,
  "limitations": ["Premium for rider not found in document 2"]
}
```

Rules: do not invent numbers absent from inputs; any monetary estimate must state its basis; findings must cite evidence or be labelled `source: llm_inference`; flag uncertainty and data gaps in `limitations`. Temperature ≤ 0.2.

### FR-4.4 Merge and validate
- Union of rule findings and LLM findings, de-duplicated by (type + normalised title similarity).
- Drop LLM findings with no evidence and severity ≥ high unless supported by a rule.
- Recompute `risk_score` deterministically: `min(100, Σ severity_weight)`, weights low 5, medium 12, high 22, critical 35.
- Sort findings: severity desc, then type.

### FR-4.5 Recommended action (enum)

| Value | Meaning | Typical trigger |
|---|---|---|
| `priority_call_now` | Contact within 24h | Renewal ≤ 30d or lapsed, hot lead |
| `schedule_review_call` | Standard consult | Gaps found, no urgency |
| `prepare_comparison_quote` | Savings opportunity | Savings found, adequate coverage |
| `request_more_documents` | Data too thin | Core fields missing or confidence low |
| `nurture` | Low urgency | Well covered, long renewal |
| `no_action` | Not a fit | Disqualifying issue |

Code proposes the action from rules; LLM may adjust one level with rationale; final value validated against the enum. `request_more_documents` also lists which docs/fields are needed.

### FR-4.6 Versioning and status
- Each run creates a new `analyses` row (`version = max+1`), status `queued → running → complete|failed`. Latest complete version is shown by default; older versions viewable.
- On `complete` for the first time: lead status `under_review → analysis_complete`. Regeneration keeps the status.
- `input_snapshot` stores document ids, extraction versions and lead fields hash to prove what was analysed. If inputs change after analysis (doc corrected), the UI shows "Analysis out of date — regenerate".

### FR-4.7 Safety and disclaimers
- Every analysis carries: "AI-generated decision support. Verify against source documents before advising the client."
- No definitive legal/medical claims; flagged as internal.

## 5. API Specification

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/leads/{lead_id}/analyses` | broker, analyst | Trigger generation → 202 `{analysis_id, status}` |
| GET | `/leads/{lead_id}/analyses` | any | List versions |
| GET | `/leads/{lead_id}/analyses/latest` | any | Latest complete analysis with findings |
| GET | `/analyses/{id}` | any | Detail |
| POST | `/analyses/{id}/feedback` | broker | `{helpful: bool, comment}` (stored in `analysis_feedback`, optional) |

**GET latest → 200 (shape)**
```json
{ "id": "uuid", "version": 2, "status": "complete", "generated_at": "…",
  "is_stale": false, "risk_score": 58,
  "recommended_action": "schedule_review_call",
  "recommendation_rationale": "…", "executive_summary": "…",
  "estimated_savings": { "amount_min": 3000, "amount_max": 6000, "currency": "INR", "basis": "…" },
  "coverage_summary": {},
  "findings": [ { "id": "uuid", "finding_type": "gap", "severity": "high", "title": "…",
                  "description": "…", "evidence": [], "estimated_value": null } ],
  "suggested_talking_points": [], "questions_for_client": [], "limitations": [],
  "confidence": 0.78, "disclaimer": "AI-generated decision support…" }
```

Optional extra table (nice-to-have): `analysis_feedback(id, analysis_id, user_id, helpful, comment, created_at)`.

## 6. Frontend Requirements

**`analysisSlice` state**
```ts
interface AnalysisState {
  byLeadId: Record<string, { latest: Analysis | null; versions: AnalysisSummary[]; status: 'idle'|'loading'|'generating'|'ready'|'error'; error?: string }>;
}
```
**Sagas:** `generateAnalysisSaga` (POST then poll latest until `complete|failed`, with cancellation on unmount), `fetchLatestAnalysisSaga`, `fetchVersionsSaga`, `submitFeedbackSaga`.

**Components:** `AnalysisPanel`, `RecommendationCard` (large action badge + rationale), `RiskScoreGauge`, `SavingsCard`, `FindingsList` with filter chips (Gaps / Savings / Risks) and `SeverityBadge`, `EvidenceLink` (opens document viewer at page), `CoverageSummaryTable`, `TalkingPoints`, `ClientQuestions`, `StaleBanner`, `GenerateButton`, `LimitationsNote`.

## 7. Non-Functional
- Generation < 60 s p95 for up to 5 documents.
- Deterministic parts unit-tested; LLM part tested against golden fixtures with schema checks.
- Prompts versioned (`analysis_v1.md`); `llm_call_logs` per run.

## 8. Tasks Checklist
- [ ] `benchmarks.yaml` and loader
- [ ] `ConsolidatedCoverage` builder (frequency normalisation, merge by line)
- [ ] Rule engine with unit tests per rule
- [ ] LLM prompt, Pydantic output schema, retry and validation
- [ ] Merge/dedupe, risk score calculation, action enum logic
- [ ] Versioning, staleness detection, lead status transition
- [ ] Endpoints and background runner
- [ ] Frontend slice, saga polling, analysis UI components
- [ ] Sample end-to-end test: sample PDF → extraction → analysis

## 9. Acceptance Criteria
1. For a lead with one extracted policy, an analysis is stored with ≥ 1 gap or risk, savings basis, risk score and recommended action.
2. Every high/critical finding shows evidence (doc, page, quote) or a rule id.
3. Thin/low-confidence data yields `request_more_documents` and lists limitations, not confident claims.
4. Editing an extraction marks the analysis stale; regenerate creates version +1.
5. Lead moves to `analysis_complete` on first success.
