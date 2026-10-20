# Frontend Development Rules

## Technology Stack

The frontend uses:

- React
- TypeScript
- Redux Toolkit
- Redux Saga
- Tailwind CSS
- ESLint
- Prettier when configured
- React Testing Library
- Vitest or Jest according to the existing project

Use versions already defined in `package.json`.

---

# Package Management

Use the package manager already configured by the project.

If using npm:

```bash
npm install
npm install <package>
npm install -D <package>
```

Do not mix npm/pnpm/yarn.

TypeScript

Use strict typing.

Avoid:

any

Prefer explicit domain types.

API request and response types must match the backend contract.

Do not use unnecessary type assertions.

Handle:

undefined
null
optional properties
API errors

explicitly.

React

Use functional components.

Prefer:

components
hooks
services
features
store

according to the existing project structure.

Do not put large business logic inside React components.

Reuse existing components and utilities.

Redux Toolkit

Use Redux Toolkit for application state.

Prefer:

createSlice
createSelector
typed useSelector
typed useDispatch

Follow the existing store architecture.

Do not introduce another state-management solution without approval.

Redux Saga

Use Redux Saga for asynchronous workflows when the existing architecture uses Saga.

Follow existing:

watcher
↓
worker
↓
API
↓
success/failure action

patterns.

Do not move Saga-managed business logic into components.

API Integration

Use the existing API client.

Do not create a second HTTP client.

Do not hardcode API URLs.

Use existing:

environment configuration
API client
authentication mechanism
error handling
Tailwind

Use Tailwind CSS.

Prefer existing design-system components and utilities.

Avoid unnecessary inline styles.

Do not introduce arbitrary CSS when existing Tailwind utilities or components are sufficient.

Maintain responsive behavior.

Accessibility

New UI should support:

keyboard navigation
accessible labels
semantic HTML
proper focus behavior
meaningful error messages

Use ARIA only when necessary.

ESLint

Run:

npm run lint

Do not disable ESLint globally.

Do not add unnecessary:

eslint-disable

comments.

Type Checking

Run the project's configured command, normally:

npm run typecheck

TypeScript errors must be fixed before completion.

Testing

Use the project's configured test framework.

Typical:

npm run test

Use React Testing Library for user-facing behavior when applicable.

Test:

rendering
user interaction
Redux state
Saga behavior
loading states
error states
API failures
important edge cases
Build

For production-affecting changes:

npm run build

Build must pass before completion.

Frontend Agent Ownership

Frontend agents own:

frontend/**

They should not modify:

backend/**

unless explicitly assigned an integration task.
---
