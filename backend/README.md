# SecureLife Backend Service

FastAPI ASGI application powering the SecureLife Intelligent Lead Pipeline, providing REST APIs, LangGraph conversational agent state machine, PyMuPDF OCR document processing, deterministic qualification scoring, and PostgreSQL persistence.

---

## Service Information & Endpoints

| Resource | URL | Description |
|---|---|---|
| **API Root** | [http://localhost:8000](http://localhost:8000) | FastAPI application base |
| **Interactive API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI documentation and test console |
| **Alternative Docs (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean ReDoc API reference |
| **Health Check** | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | System health & DB connection status |

---

## Prerequisites

Ensure you have one of the following setups available:

* **Docker & Docker Compose** (Recommended)
* **Python 3.11+** with the [`uv`](https://docs.astral.sh/uv/) package manager (for local development)
* **PostgreSQL 15+** (if running natively without Docker)

---

## Installation & Setup

### 1. Environment Configuration

From the `backend/` directory, create your `.env` configuration file from the template:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `securelife` | Database name |
| `POSTGRES_PORT` | `5432` | Exposed database port |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/securelife` | Async SQLAlchemy connection URI |
| `LLM_PROVIDER` | `mock` | LLM inference backend (`mock`, `groq`, `openai`) |
| `GROQ_API_KEY` | *(empty)* | API key when `LLM_PROVIDER=groq` |
| `JWT_SECRET_KEY` | *(preconfigured)* | Secret used to sign broker authentication JWTs |

> **Note on LLM Provider**:
> For offline development and testing, `LLM_PROVIDER=mock` runs without external API calls.
> To enable live LLM dialogue and extraction, set `LLM_PROVIDER=groq` and supply a valid `GROQ_API_KEY`.

---

### 2. Running with Docker Compose (Recommended)

From the `backend/` directory:

```bash
# 1. Build and start PostgreSQL and Backend containers
docker compose up -d --build

# 2. Verify containers are healthy
docker ps --filter "name=securelife"
```

Containers launched:
* `securelife_postgres_dev`: PostgreSQL 16 Alpine with healthcheck on port `5432`.
* `securelife_backend_dev`: FastAPI application mounted with live code-reloading on port `8000`.

---

### 3. Running Locally with `uv` (Without Docker)

If you have a local PostgreSQL instance running:

```bash
# 1. Install dependencies into a virtual environment
uv sync

# 2. Run database migrations to head
uv run alembic upgrade head

# 3. Seed database with initial test data
uv run python -m app.db.seed

# 4. Start the FastAPI development server with auto-reload
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Database Migrations (Alembic)

Database schemas are strictly managed and version-controlled using Alembic.

### Apply Migrations to Latest Schema (`head`)

**Inside Docker:**
```bash
docker exec securelife_backend_dev uv run alembic upgrade head
```

*Alternative via Docker Compose:*
```bash
docker compose exec backend uv run alembic upgrade head
```

*Locally with `uv`:*
```bash
uv run alembic upgrade head
```

### Roll Back Migrations

To revert one migration step:
```bash
docker exec securelife_backend_dev uv run alembic downgrade -1
```

To roll back all migrations to initial state:
```bash
docker exec securelife_backend_dev uv run alembic downgrade base
```

### Create a New Migration

After modifying models in `app/models/` or `app/db/models.py`:
```bash
docker exec securelife_backend_dev uv run alembic revision --autogenerate -m "describe_schema_change"
```

---

## Database Seeding

The seed script (`app/db/seed.py`) populates initial team accounts (Brokers, Agents, Admins) and sample insurance leads across all pipeline stages with messages, notes, and documents.

### Run Seed Script

**Inside Docker:**
```bash
docker exec securelife_backend_dev uv run python -m app.db.seed
```

*Locally with `uv`:*
```bash
uv run python -m app.db.seed
```

### Clean Reseed Runbook

If you want to wipe sample data and reseed fresh leads:
```bash
# Roll back all migrations to base, re-apply, and reseed
docker exec securelife_backend_dev uv run alembic downgrade base
docker exec securelife_backend_dev uv run alembic upgrade head
docker exec securelife_backend_dev uv run python -m app.db.seed
```

---

## Pre-Configured Test Accounts

| Role | Email | Password | Full Name | Capabilities |
|---|---|---|---|---|
| **Senior Broker** | `broker@securelife.com` | `password123` | Rajesh Sharma | Full pipeline access, lead reassignment, document underwriting approval |
| **Underwriting Agent** | `agent@securelife.com` | `password123` | Pooja Verma | Lead intake, document OCR verification, notes |
| **Admin** | `admin@securelife.com` | `password123` | Vikram Mehta | Full system and user administration |

---

## Testing & Code Quality

Run the test suite using `pytest`:

**Inside Docker:**
```bash
docker exec securelife_backend_dev uv run pytest
```

*Locally with `uv`:*
```bash
uv run pytest
```

To run a specific test file:
```bash
docker exec securelife_backend_dev uv run pytest tests/integration/test_chat_endpoints.py -v
```

---

## Project Structure

```
backend/
├── alembic/              # Alembic migration scripts and versions
├── alembic.ini           # Alembic database configuration
├── app/
│   ├── api/v1/           # REST routers (leads, chat, documents, analysis, users, auth)
│   ├── core/             # Configuration, security, logging, JWT tokens
│   ├── db/               # SQLAlchemy engine, session factory, seed script
│   ├── models/           # SQLAlchemy ORM entity definitions
│   ├── repositories/     # Database CRUD access layer
│   ├── schemas/          # Pydantic v2 request/response models
│   ├── services/         # Business logic (qualification, OCR, LangGraph chat, analysis)
│   └── main.py           # FastAPI application entrypoint
├── docker/               # Dockerfile.dev for containerized development
├── docker-compose.yml    # Service definition for Backend + PostgreSQL
├── pyproject.toml        # Dependencies and project metadata managed by uv
└── tests/                # Unit and integration test suites
```
