# SecureLife Intelligent Lead Pipeline & Broker CRM

An enterprise-grade insurance lead qualification, customer relationship management (CRM), and intelligent document processing (IDP) platform built for modern brokerage teams.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    Prospect Web Chat Widget (FRD-01)  │
                      │    Broker Pipeline Portal   (FRD-05)  │
                      │    React 19 + Redux-Saga + Tailwind   │
                      └──────────────────┬────────────────────┘
                                         │ HTTP REST / SSE
                                         ▼
                      ┌───────────────────────────────────────┐
                      │          FastAPI ASGI Gateway         │
                      │   JWT Auth · CORS · Pydantic v2       │
                      └──────────────────┬────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌───────────────┐              ┌──────────────────┐             ┌───────────────────┐
│  LangGraph    │              │    PyMuPDF +     │             │  Deterministic    │
│  Dialogue     │              │  OCR Extraction  │             │  Scoring & Rules  │
│  State Machine│              │   Engine (FRD-03)│             │  (FRD-02, FRD-04) │
└───────┬───────┘              └────────┬─────────┘             └─────────┬─────────┘
        │                               │                                 │
        └───────────────────────────────┼─────────────────────────────────┘
                                        ▼
                      ┌───────────────────────────────────────┐
                      │    PostgreSQL 15+ Relational Storage  │
                      │    Leads · Documents · Analyses · Logs│
                      └───────────────────────────────────────┘
```

---

## Service Endpoints & Default Ports

| Service | URL | Purpose |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Public conversational intake chat & Broker Portal |
| **Broker CRM Dashboard** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Pipeline Kanban, Leads Directory & Review Queue |
| **Backend API Gateway** | [http://localhost:8000](http://localhost:8000) | FastAPI REST service |
| **Interactive API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI interactive schema and test console |
| **Alternative API Docs (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean API documentation reference |
| **PostgreSQL Database** | `localhost:5432` | Relational database (Default DB: `securelife`) |

---

## Installation & Setup

For step-by-step installation, environment setup, database migrations, seeding runbooks, and test suite execution, please refer directly to the respective service documentation:

* [**Backend Service Setup & Guide**](backend/README.md)
  * Docker Compose & Local Native setup (`uv`)
  * Alembic database migrations (`upgrade head`, `downgrade`, `revision`)
  * Database seeding (`app.db.seed`) & fresh reseed runbook
  * Backend test suite execution (`pytest`)
  * Interactive API Swagger & ReDoc documentation

* [**Frontend Application Setup & Guide**](frontend/README.md)
  * Docker Compose & Local Native setup (`npm`)
  * Environment configuration (`VITE_API_URL`)
  * NPM scripts (`dev`, `build`, `preview`, `lint`, `typecheck`)
  * Frontend unit & component test execution (`Vitest`)
  * Feature modules & architecture breakdown

---

## Pre-Configured Test Accounts

Log in to the Broker Portal at [http://localhost:5173/dashboard](http://localhost:5173/dashboard) using any of the following pre-seeded test accounts:

| Role | Email | Password | Full Name | Capabilities |
|---|---|---|---|---|
| **Senior Broker** | `broker@securelife.com` | `password123` | Rajesh Sharma | Full pipeline access, lead reassignment, document underwriting approval |
| **Underwriting Agent** | `agent@securelife.com` | `password123` | Pooja Verma | Lead intake, document OCR verification, notes |
| **Admin** | `admin@securelife.com` | `password123` | Vikram Mehta | Full system and user administration |

---

## Project Directory Map

```
securelife-insurance-brokers/
├── backend/
│   ├── alembic/              # Alembic database migrations and version files
│   ├── alembic.ini           # Alembic configuration
│   ├── app/
│   │   ├── api/routers/      # REST API endpoints (leads, chat, documents, analysis, auth)
│   │   ├── core/             # Configuration, security, JWT auth, logging
│   │   ├── db/               # SQLAlchemy models (Lead, Document, Analysis, etc.) & seed script
│   │   ├── services/         # Business logic (qualification, OCR, analysis, LangGraph chat)
│   │   └── main.py           # FastAPI application entrypoint
│   ├── docker/               # Dockerfile.dev for backend
│   ├── docker-compose.yml    # Docker Compose definition (FastAPI + PostgreSQL)
│   └── pyproject.toml        # Python project dependencies managed via uv
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── chat/         # Conversational intake widget (FRD-01)
│   │   │   ├── crm/          # Broker Pipeline Kanban, Leads Table, Review Queue (FRD-05)
│   │   │   ├── documents/    # Document Uploader, PDF Viewer, Extraction Editor (FRD-03)
│   │   │   └── analysis/     # Coverage Gap & Savings Decision Cards (FRD-04)
│   │   ├── store/            # Redux Toolkit root reducer and Redux-Saga root
│   │   ├── utils/            # Status styles & design tokens (statusStyles.ts)
│   │   ├── App.tsx           # Main application routing & auth gate
│   │   └── main.tsx          # React application root
│   ├── docker-compose.yml    # Docker Compose definition for frontend
│   └── package.json          # Node dependencies and scripts
└── docs/                     # Full PRD and Functional Requirement Documents (FRD-01 to FRD-05)
```

---

## Documentation Index

| Document | Purpose |
|---|---|
| [**Functional Overview**](docs/FUNCTIONAL_OVERVIEW.md) | Business workflows, target personas, FRD-01 to FRD-05 functional breakdown, and ROI metrics |
| [**System Design & Scalability**](docs/SYSTEM_DESIGN_AND_SCALABILITY.md) | High-level system architecture, component design, database scaling, async worker pool, and P95 SLAs |
| [**Architecture Evaluation & Failure Modes**](docs/ARCHITECTURE_EVALUATION_AND_FAILURE_MODES.md) | Problem decomposition, tech stack justifications, and in-depth failure mode mitigations |
| [**Product Requirements Document (PRD)**](docs/PRD.md) | Complete product scope, user personas, MVP goals, and non-goals |
| [**FRD-01: Conversational Chatbot**](docs/FRD-01-lead-capture-chatbot.md) | LangGraph dialogue state machine, slot filling, and handoff specifications |
| [**FRD-02: Data Storage & CRM Layer**](docs/FRD-02-data-storage.md) | PostgreSQL schema, deterministic scoring engine, and core REST APIs |
| [**FRD-03: Document Processing (IDP)**](docs/FRD-03-document-processing.md) | PyMuPDF rasterization, OCR extraction, confidence scoring, and review queue |
| [**FRD-04: Intelligent Analysis**](docs/FRD-04-intelligent-analysis.md) | Coverage gap detector, savings calculator, and executive broker dossier |
| [**FRD-05: Broker Dashboard & Portal**](docs/FRD-05-dashboard.md) | Multi-view pipeline (Kanban, Funnel, Table), leads directory, and journey timeline |

