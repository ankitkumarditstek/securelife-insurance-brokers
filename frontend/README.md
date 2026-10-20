# SecureLife Frontend Application

React 19 + TypeScript single-page application (SPA) built with Vite, Redux Toolkit, Redux-Saga, and Tailwind CSS. Provides the public prospect conversational intake widget and the authenticated SecureLife Broker CRM Portal.

---

## Service Information & Endpoints

| Resource | URL | Description |
|---|---|---|
| **Public Chatbot Landing Page** | [http://localhost:5173](http://localhost:5173) | Prospect conversational intake assistant (FRD-01) |
| **Broker CRM Portal** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Pipeline Kanban, Leads Directory, and Review Queue (FRD-05) |
| **Broker Sign In Modal** | [http://localhost:5173/login](http://localhost:5173/login) | Role-gated broker authentication view |

---

## Prerequisites

Ensure you have one of the following setups available:

* **Docker & Docker Compose** (Recommended)
* **Node.js 20+** and **npm** (for native host development)

---

## Installation & Setup

### 1. Environment Configuration

From the `frontend/` directory, create your `.env` configuration file:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Base URL of the FastAPI backend service |
| `PORT` | `5173` | Local development port |

---

### 2. Running Locally with `npm` (Without Docker)

From the `frontend/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available NPM Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts local Vite development server with HMR |
| `npm run build` | Compiles TypeScript (`tsc -b`) and produces production Vite bundle in `dist/` |
| `npm run preview` | Previews the compiled production build locally |
| `npm test -- --run` | Executes all Vitest unit and component tests |
| `npm run test:watch` | Starts Vitest in interactive watch mode |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run format` | Formats all code using Prettier |
| `npm run typecheck` | Type-checks all TypeScript files without emitting files |

---

## Architecture & Feature Modules

```
frontend/src/
├── features/
│   ├── chat/                 # Conversational lead intake widget (FRD-01)
│   │   ├── components/       # ChatWindow, MessageBubble, ChatInput, UploadPromptCard
│   │   ├── chatSlice.ts      # Redux state for messages, slots, session token
│   │   └── chatSagas.ts      # Redux-Saga async side-effects (send, resume)
│   ├── crm/                  # Broker Pipeline & CRM Workspace (FRD-05)
│   │   ├── components/       # CrmDashboard, PipelineKanban, FunnelChart, LeadsTable,
│   │   │                     # ReviewQueue, LeadDetailModal, JourneyTimeline, Sidebar
│   │   ├── crmSlice.ts       # CRM state (views, filters, pagination, lead detail)
│   │   └── crmSagas.ts       # Async sagas (fetch leads, update status, notes, users)
│   ├── documents/            # Intelligent Document Processing IDP UI (FRD-03)
│   │   ├── components/       # DocumentUploader, DocumentList, ExtractionViewer,
│   │   │                     # PdfPreviewPane, ConfidenceBadge, EvidencePopover
│   │   ├── documentsSlice.ts # Document summaries and active extraction state
│   │   └── documentsSagas.ts # Upload and extraction polling sagas
│   └── analysis/             # Underwriting Decision Support (FRD-04)
├── services/
│   └── apiClient.ts          # Axios client with JWT interceptor & base URL
├── store/
│   ├── rootReducer.ts        # Combined Redux state
│   ├── rootSaga.ts           # Combined root saga
│   └── index.ts              # Redux store configuration
└── utils/
    └── statusStyles.ts       # Central design tokens for CRM statuses & tiers
```

---

## Testing & Quality Assurance

```bash
# Run test suite
npm test -- --run

# Run linter
npm run lint

# Validate build
npm run build
```
