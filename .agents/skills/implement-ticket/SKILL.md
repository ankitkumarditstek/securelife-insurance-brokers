---
name: implement-ticket
description: Execute the complete full-stack development lifecycle for a ticket.
---

# Implement Ticket

When this skill is invoked, execute the following lifecycle.

---

# PHASE 1 — Understand

Read:

- `/AGENTS.md`
- `/backend/AGENTS.md`
- `/frontend/AGENTS.md`

when applicable.

Inspect the repository.

---

# PHASE 2 — Plan

Invoke:

planner

The planner must determine:

- backend work
- frontend work
- database work
- API contract
- Redux work
- Saga work
- tests
- security concerns
- file ownership
- parallelization

Do NOT start implementation before the plan is approved.

---

# PHASE 3 — Human Approval

Show the implementation plan.

Wait for approval.

---

# PHASE 4 — Branch

Create:

feature/<ticket-id>-<description>

or:

fix/<ticket-id>-<description>

Never work directly on main/master.

---

# PHASE 5 — Backend

If backend changes are required:

Invoke:

backend-developer

Scope:

backend/**

---

# PHASE 6 — Frontend

If frontend changes are required:

Invoke:

frontend-developer

Scope:

frontend/**

Backend and frontend may run in parallel when their API contract is sufficiently defined.

---

# PHASE 7 — Testing

Backend:

backend-tester

Frontend:

frontend-tester

Run only the relevant agents.

---

# PHASE 8 — Integration

If both frontend and backend changed:

Invoke:

integration-tester

Verify the real API contract.

---

# PHASE 9 — Security

Invoke:

security-reviewer

CRITICAL/HIGH findings block completion.

---

# PHASE 10 — Code Review

Invoke:

code-reviewer

CRITICAL/HIGH findings block completion.

---

# PHASE 11 — Fix

If issues exist:

Backend issues → backend-developer

Frontend issues → frontend-developer

Then repeat:

tests
↓
integration
↓
security
↓
code review

until clean.

---

# PHASE 12 — Final Validation

Inspect:

```bash
git status
git diff --stat
git diff