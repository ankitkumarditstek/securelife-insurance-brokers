# Project Development Rules

## Repository Structure

This is a full-stack application.

- `backend/` → Python backend
- `frontend/` → React frontend
- `.agents/` → AI agents and SDLC skills

---

# General Rules

## Git

- Never work directly on `main` or `master`.
- Every ticket must use a feature/fix/refactor branch.
- Never force push.
- Never merge a PR automatically.
- Do not push or create a PR without explicit human approval.

Branch naming:

- `feature/<ticket-id>-<description>`
- `fix/<ticket-id>-<description>`
- `refactor/<ticket-id>-<description>`

---

# Development

Before implementing any ticket:

1. Understand the requirement.
2. Inspect the existing architecture.
3. Identify affected components.
4. Create an implementation plan.
5. Define API contracts when backend and frontend are involved.
6. Get human approval of the plan.
7. Implement.
8. Test.
9. Review.
10. Security review.
11. Final validation.
12. Human approval.
13. Commit and create PR.

---

# Code Quality

- Follow existing project architecture.
- Reuse existing utilities and abstractions.
- Do not introduce unnecessary dependencies.
- Do not modify unrelated files.
- Do not remove tests just to make them pass.
- Do not weaken assertions.
- Do not disable linting/type checking globally.
- Do not bypass quality checks.

---

# Backend / Frontend Contract

When a ticket affects both backend and frontend:

- Backend owns backend implementation.
- Frontend owns frontend implementation.
- Both must follow the same API contract.
- Do not invent different request/response structures.
- Integration testing is required.

---

# Security

Never expose:

- passwords
- access tokens
- refresh tokens
- API keys
- secrets
- PHI
- PII

Do not log sensitive information.

All tenant-scoped resources must enforce tenant isolation.

---

# Definition of Done

A ticket is complete only when:

- implementation is complete
- backend tests pass when applicable
- frontend tests pass when applicable
- lint passes
- type checking passes
- build passes when applicable
- integration tests pass when applicable
- security review passes
- code review passes
- no CRITICAL/HIGH findings remain
- unrelated changes are removed
- final diff has been reviewed
- human approves PR creation