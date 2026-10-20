# FRD-05 — Dashboard (Frontend)

Parent: `PRD.md` · Consumes APIs from FRD-01 to FRD-04 · Stack: React, TypeScript, Redux Toolkit, Redux-Saga, Tailwind CSS

## 1. Objective
A clean, professional interface where the SecureLife team sees the entire pipeline at a glance and drills into any lead's full journey: conversation → documents → extraction → analysis → recommendation. Presentation matters: it must look polished, not like a raw data dump.

## 2. Users
Sales Agent (monitor and follow up), Analyst (verify extraction), Senior Broker (review analysis, decide).

## 3. Information Architecture and Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login | public |
| `/` | Dashboard overview (KPIs + pipeline) | authenticated |
| `/leads` | Leads table (filter/search/sort) | authenticated |
| `/leads/:id` | Lead detail (tabs) | authenticated |
| `/chat` | Public prospect chat widget page (FRD-01) | public |
| `/upload/:token` | Public document upload page (optional) | token |

Layout: left sidebar (Dashboard, Leads, Review Queue, Settings), top bar (global search, notifications, user menu), content area.

## 4. Pages and Features

### 4.1 Dashboard overview (`/`)
- **KPI cards:** Total leads, New today, Hot leads waiting, Documents awaiting review, Analyses completed, Avg time to analysis, Conversion rate.
- **Pipeline board (Kanban)** columns: New / In conversation → Qualified → Documents pending → Under review → Analysis complete → Closed. Cards show name, tier badge, score, interest chips, time in stage, assignee avatar, needs-human flag. Drag-and-drop to change status where allowed by transition rules (invalid drops snap back with a toast). Toggle between **Board** and **Funnel chart** views.
- **Attention panel:** "Needs your attention" list — hot leads without assignee, documents needing review, failed processing, renewals < 30 days.
- **Recent activity feed** (from status history).

### 4.2 Leads table (`/leads`)
- Columns: Name, Contact, Interest, Status, Score/Tier, Docs (count and state), Assigned to, Last activity, Created.
- Filters: status (multi), tier, assignee, has documents, date range. Search by name/email/phone (debounced 300 ms).
- Sorting, pagination (server side), URL-synced query params, saved column density toggle, empty and loading skeleton states.
- Row click opens lead detail; bulk assign (broker role).

### 4.3 Lead detail (`/leads/:id`)
**Header:** name, status badge, tier and score ring, contact buttons (copy email/phone), assignee dropdown, status action menu ("Mark closed won/lost", "Requalify"), needs-human banner.

**Left rail:** profile card (captured fields), qualification breakdown (bar per factor with reason), AI summary, notes box.

**Main tabs**
| Tab | Content |
|---|---|
| **Journey** (default) | Vertical timeline combining: lead created, chat messages summary, qualified, document uploaded/processed, extraction verified, analysis generated, status changes, notes. Each node links to its tab |
| **Conversation** | Full transcript in chat-bubble style with extracted-slot chips on messages; read-only |
| **Documents** | Upload area, document list with status, side-by-side PDF preview and extraction viewer, confidence badges, evidence popovers, inline edit, verify button, reprocess |
| **Analysis** | Recommendation card, risk gauge, savings card, findings list (filters), coverage summary, talking points, client questions, stale banner, regenerate, version selector |
| **Activity** | Status history table and notes |

### 4.4 Review queue (`/review`)
List of extractions with `needs_review` ordered by confidence ascending; quick open to Documents tab at the document.

### 4.5 Login
Email and password; error handling; redirect to intended route; token refresh or forced re-login on 401.

## 5. Design System (Tailwind)

| Aspect | Spec |
|---|---|
| Palette | Primary deep blue/indigo, neutral slate greys, semantic: green success, amber warning, red danger, sky info |
| Tier colours | hot = red/orange, warm = amber, cold = slate-blue |
| Status colours | one consistent badge colour per lifecycle status (single source: `statusStyles.ts`) |
| Typography | Inter; scale: 12/14/16/20/24/30 |
| Spacing and radius | 4px grid, rounded-xl cards, soft shadows |
| Dark mode | Optional stretch (class strategy) |
| Components (`components/ui`) | Button, IconButton, Badge, Card, Table, Tabs, Modal, Drawer, Dropdown, Tooltip, Toast, Skeleton, EmptyState, ProgressBar, Stepper, Avatar, Gauge, Timeline, ConfirmDialog |
| Charts | Recharts (funnel, bar, sparkline) |
| Icons | lucide-react |
| Accessibility | WCAG AA contrast, keyboard navigable tabs/menus, focus rings, aria labels |
| Responsive | Desktop first; tablet OK; table → cards on mobile; chat page mobile-first |

Every data view has **loading (skeleton)**, **empty** (illustration and CTA), and **error** (message and retry) states.

## 6. State Management

### 6.1 Store layout
```ts
RootState = {
  auth: AuthState,
  chat: ChatState,            // FRD-01
  leads: LeadsState,
  documents: DocumentsState,  // FRD-03
  analysis: AnalysisState,    // FRD-04
  dashboard: DashboardState,
  ui: UiState                 // toasts, sidebar, filters persistence
}
```

```ts
interface LeadsState {
  list: { items: LeadSummary[]; total: number; page: number; pageSize: number;
          filters: LeadFilters; sort: string; status: 'idle'|'loading'|'succeeded'|'failed'; error?: string };
  detail: { byId: Record<string, LeadDetail>; status: Record<string, 'idle'|'loading'|'succeeded'|'failed'> };
  conversation: Record<string, Message[]>;
  history: Record<string, StatusHistoryItem[]>;
  notes: Record<string, Note[]>;
  users: UserSummary[];
}
interface DashboardState {
  summary: DashboardSummary | null;
  pipeline: Record<LeadStatus, LeadCard[]>;
  attention: AttentionItem[];
  status: 'idle'|'loading'|'succeeded'|'failed'; lastUpdated?: string;
}
```

### 6.2 Sagas

| Saga | Effect pattern | Notes |
|---|---|---|
| `loginSaga`, `logoutSaga`, `refreshProfileSaga` | `takeLatest` | store JWT, attach via axios interceptor, 401 → logout |
| `fetchLeadsSaga` | `takeLatest` + `debounce(300)` on search | uses current filters from state (`select`) |
| `fetchLeadDetailSaga` | `takeLatest` | parallel `all([...])` for detail, history, notes |
| `fetchConversationSaga` | `takeLatest` | |
| `updateLeadStatusSaga` | `takeEvery` | optimistic move on Kanban, rollback on 409 via `put(revert)` and toast |
| `assignLeadSaga`, `addNoteSaga`, `updateLeadSaga` | `takeEvery` | |
| `fetchDashboardSaga` | `takeLatest` | plus background `pollDashboardSaga` every 30 s (`race` with logout/stop) |
| Document and analysis sagas | see FRD-03 / FRD-04 | polling with cancellation |
| `errorToastSaga` | `takeEvery(/failure$/)` | central toast mapping |

Rules: all API calls through `api/httpClient.ts`; error normalisation to `{code,message}`; selectors with `createSelector`; typed hooks `useAppDispatch/useAppSelector`; RTK `createSlice` for reducers, no thunks (sagas own side effects).

### 6.3 Type contracts
`types/domain.ts` mirrors backend: `LeadStatus`, `LeadTier`, `LeadSummary`, `LeadDetail`, `Message`, `DocumentSummary`, `ExtractionResult`, `Analysis`, `Finding`, `DashboardSummary`. Keep API-to-UI mapping in `mappers.ts` (snake_case → camelCase).

## 7. API Consumption Map

| UI element | Endpoint |
|---|---|
| KPI cards | `GET /dashboard/summary` |
| Kanban | `GET /dashboard/pipeline` |
| Leads table | `GET /leads` |
| Lead header and profile | `GET /leads/{id}` |
| Conversation tab | `GET /leads/{id}/conversation` |
| Status actions | `POST /leads/{id}/status` |
| Assign | `POST /leads/{id}/assign`, `GET /users` |
| Notes | `GET/POST /leads/{id}/notes` |
| Documents tab | `/leads/{id}/documents`, `/documents/{id}/extraction`, `/documents/{id}/file` |
| Analysis tab | `/leads/{id}/analyses(/latest)` |
| Activity | `GET /leads/{id}/history` |

## 8. Component Tree (lead detail)

```
LeadDetailPage
 ├─ LeadHeader (StatusBadge, TierScoreRing, AssigneeSelect, StatusMenu)
 ├─ LeadSidebar (ProfileCard, QualificationBreakdown, AiSummary, NotesPanel)
 └─ Tabs
     ├─ JourneyTimeline
     ├─ ConversationView (MessageBubble, SlotChips)
     ├─ DocumentsTab (DocumentUploader, DocumentList, PdfPreviewPane, ExtractionViewer…)
     ├─ AnalysisPanel (RecommendationCard, RiskScoreGauge, SavingsCard, FindingsList…)
     └─ ActivityTab (StatusHistoryTable)
```

## 9. Non-Functional
- Initial load < 2 s on broadband; route-level code splitting (`React.lazy`).
- Table renders 50 rows without jank; memoised row components.
- No unhandled promise or saga crashes: root saga wraps watchers in `spawn` with restart-on-error.
- ESLint, Prettier, strict TypeScript (`strict: true`), Vitest and React Testing Library for key components, MSW for API mocks.
- Env via `VITE_API_BASE_URL`.

## 10. Tasks Checklist
- [ ] Vite + React + TS + Tailwind setup, ESLint/Prettier, path aliases
- [ ] Store, root saga with error-safe spawn, axios client + interceptors
- [ ] Auth flow and protected routes
- [ ] UI component library and status/tier style maps
- [ ] Dashboard overview: KPI cards, Kanban (with DnD), attention panel
- [ ] Leads table with filters, search, pagination, URL sync
- [ ] Lead detail: header, sidebar, Journey, Conversation tabs
- [ ] Documents tab (integrate FRD-03 components)
- [ ] Analysis tab (integrate FRD-04 components)
- [ ] Review queue page
- [ ] Toasts, skeletons, empty and error states
- [ ] MSW mocks + seed-based demo; tests for slices, sagas and key components
- [ ] Final polish pass: spacing, responsive, a11y

## 11. Acceptance Criteria
1. Dashboard shows accurate counts and a pipeline board that matches `GET /dashboard/summary`.
2. Leads table filters, search and pagination work and persist in the URL.
3. Lead detail shows the entire journey: conversation, documents with extracted data, analysis and recommendation.
4. Invalid status drag/drop is rejected gracefully (rollback and message).
5. Uploading a document shows progress, then processing state, then extracted data without page reload.
6. Every view handles loading, empty and error states; layout looks professional on desktop and tablet.
