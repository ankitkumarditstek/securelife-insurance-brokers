# Backend Development Rules

## Technology Stack

The backend uses:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- uv
- pytest
- Ruff
- mypy

Follow the versions already defined in the project.

---

# Package Management

Use `uv` for all Python dependency management.

Use:

```bash
uv sync
uv add <package>
uv add --dev <package>
uv remove <package>
uv run <command>
```
Do NOT use:

pip install

for project dependency management.

Python

All new production code should have proper type hints.

Prefer:

def get_user(user_id: UUID) -> User:
    ...

instead of:

def get_user(user_id):
    ...

Avoid:

Any

unless there is a justified reason.

Do not broadly disable mypy.

FastAPI

Use:

Pydantic request schemas
explicit response schemas
existing authentication mechanisms
existing authorization mechanisms

Do not put large business logic directly inside route handlers.

Follow the existing:

router
    ↓
service/use-case
    ↓
repository
    ↓
database

architecture if the project uses it.

Database

Use SQLAlchemy according to existing project patterns.

Database schema changes MUST use Alembic.

Never manually modify production database schema.

Before creating a migration:

Understand the existing schema.
Check existing migrations.
Create the migration.
Verify upgrade.
Verify downgrade when appropriate.
Multi-Tenancy

This application may contain tenant-scoped data.

Every tenant-scoped query MUST enforce tenant isolation.

Never trust a tenant ID supplied by the client when the authenticated context already determines the tenant.

Check authorization before returning tenant data.

Testing

Use pytest.

Tests should cover:

happy path
validation errors
authorization
tenant isolation
edge cases
regressions
database behavior
API behavior

Run:

uv run pytest
Ruff

Use Ruff for linting and formatting.

Run:

uv run ruff check .
uv run ruff format --check .

When formatting code:

uv run ruff format .

Do not introduce another formatter unless the project explicitly requires it.

mypy

Run:

uv run mypy .

New code should be properly typed.

Do not solve typing errors with broad:

# type: ignore

Use the smallest possible suppression when absolutely necessary.

Logging

Never log:

passwords
tokens
API keys
PHI
PII
secrets

Use the project's existing structured logging/request-ID mechanism.

Backend Agent Ownership

Backend agents own:

backend/**

They should not modify:

frontend/**

unless explicitly assigned an integration task.
---
