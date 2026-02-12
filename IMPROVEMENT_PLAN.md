# Improvement Plan

## Executive Summary
This document consolidates a comprehensive improvement plan for the Library SaaS project. It focuses on production-grade stability, security, performance, observability, test coverage, and maintainability across Owner/Staff/Student/Admin portals. It is organized for phased execution with clear, actionable items and code references.

## Goals
- Achieve consistent multi-tenant isolation and enforce permissions centrally
- Harden security (auth, cookies, CSRF, rate limiting, audits)
- Reduce first-load and aggregate query latency through indexes and caching
- Improve reliability and diagnosis via structured logs, metrics, tracing, and alerts
- Raise test coverage with unit, integration, and E2E tests; gate CI
- Prepare for scaling to 50–100 branches per tenant with 100–150 seats per branch

## Current State Summary
- Stack: Next.js 16, Prisma/Postgres (Neon), Tailwind, Framer Motion, date-fns, server actions
- Multi-tenant: Library as root, consistent libraryId/branchId scoping in actions
- Issues: initial SSR latency on dashboard; dev DB connectivity previously unstable; lint debt
- Strengths: good domain modeling, clear action/UI separation, consistent query scoping

## Architecture
- Centralize authorization policies (RBAC/ABAC) and apply in server actions
- Extract shared query builders for libraryId/branchId filters and common selects
- Use zod validation for all write actions and sensitive reads
- Standardize business timezone and calendar rules; store in UTC, render in local
- References:
  - Datasource and actions: [prisma.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/lib/prisma.ts), [dashboard.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/owner/dashboard.ts)

## Security
- Cookies: set Secure, HttpOnly, SameSite=strict in production
- Rate limiting/backoff: login, password reset, public booking
- CSRF: validate tokens for any non-server-action POST endpoints
- Secrets management: remove real secrets from .env in repo; use environment manager and .env.example
- Expand audit logs to owner/staff critical operations (payments, plan changes, allocations)
- References:
  - Admin audit flows: [admin/settings.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/admin/settings.ts), [PlatformAuditLog](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L894-L907)
  - Current secrets (to sanitize): [.env](file:///c:/Users/insti/OneDrive/Desktop/library/.env)

## Data Model & Indexing
- Add compound indexes on hot paths:
  - StudentSubscription: (libraryId, branchId, status, endDate)
  - Payment: (libraryId, status, date, method) when filtered/grouped by method
  - Attendance: (libraryId, branchId, checkIn) for range counts
- Use transactions for multi-entity updates (payments + subscriptions, cash handovers)
- Consider soft deletes and archival tables for immutable audit history of critical entities
- References:
  - Models: [schema.prisma](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma)

## Performance & Caching
- Cache dashboard aggregates (Today/Week/Month/Custom) with short TTL and targeted revalidation
- Precompute monthly revenue buckets on writes or nightly job to avoid heavy runtime sums
- Tighten select/include to minimal fields for list endpoints; adopt cursor-based pagination for feeds
- Confirm pooled DB connections in production; set reasonable connection limits
- References:
  - Dashboard actions: [dashboard.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/owner/dashboard.ts)

## Observability & Reliability
- Structured logging (JSON) with correlation/request IDs in server actions
- Error monitoring (Sentry) and tracing (OpenTelemetry) across server and critical UI flows
- Alerts for error rates, latency spikes, and DB connectivity
- Extend audit coverage to owner/staff sensitive operations
- Health endpoints and readiness probes for deployments
- References:
  - Platform audit models: [schema.prisma:PlatformAuditLog](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L894-L907)

## Testing & QA
- Unit tests:
  - KPI range calculations, trend comparisons (Today/Yesterday/Week/Month/Custom)
  - Finance totals, seat/locker availability logic
- Integration tests:
  - Owner finance actions, booking flows, subscription renewals, locker/seat assignments
- E2E tests:
  - Role logins (Owner/Staff/Student), booking + payment checkout, attendance scanning, support ticket lifecycle, platform subscription updates
- CI gates:
  - Typecheck (tsc --noEmit), lint (eslint), test, build required to pass pre-deploy
- References:
  - KPI/trend logic: [dashboard.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/owner/dashboard.ts)

## Infrastructure & DB Connectivity
- Production: use Neon pooled endpoint with PgBouncer compatibility; adjust connection_limit to expected concurrency
- Autosuspend tuning: increase window or keep compute warm for critical workloads
- Apply conservative timeouts and retry logic for initial DB access if needed
- Ensure directUrl (unpooled) reserved for migrations only
- References:
  - Datasource: [schema.prisma](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L6-L10)

## DevOps & CI/CD
- Pipeline stages: install → prisma generate → typecheck → lint → test → build → deploy
- Preview environments seeded with realistic data for QA
- Secrets via environment manager; .env.example in repo without real values
- Feature flags: controlled rollouts, plan-based toggles with audit

## UX & Accessibility
- KPI trend labels (e.g., “vs Last Week”) and delta coloring to improve comprehension
- Consistent filter components with ARIA attributes; keyboard navigation across tables/forms
- Skeleton/loading states to prevent layout shifts; empty states and error messaging
- Mobile layouts: compact tables (payments, subscriptions), sticky headers, responsive charts
- References:
  - Owner navigation and components: [OwnerLayoutClient.tsx](file:///c:/Users/insti/OneDrive/Desktop/library/src/components/owner/layout/OwnerLayoutClient.tsx)

## SaaS Plan Enforcement
- Enforce SaasPlan limits in server actions:
  - maxBranches, maxSeats, maxActiveStudents
- Feature toggles per plan; override per library with audit trail
- References:
  - Plan limits: [SaasPlan](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L909-L940)

## Operations & Workflows
- Emails: queue and send asynchronously; prefer Resend over raw SMTP
- Payment reconciliation: nightly summaries per branch/method; discrepancy tracking
- Seat/locker assignment: guard with atomic checks and transactions; handle race conditions
- Support ticket SLA tracking and escalations for platform support

## PWA & Mobile
- Enable service worker with offline fallback pages; cache critical assets/routes
- Push notifications for key events (renewals, attendance reminders)
- Optimize mobile performance with lighter components and deferred heavy queries
- References:
  - Manifest configuration: [app/manifest.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/app/manifest.ts)

## Scalability Roadmap
- Baseline (now): comfortably support 20–30 branches per tenant with 100–150 seats each
- With indexes + caching: 50–100 branches feasible
- Beyond that: consider event ledger for payments/attendance, precomputed summaries, and partitioning large tables by libraryId

## Risk Register
- DB connectivity regressions without pooling or autosuspend tuning
- Timezone inconsistencies causing incorrect KPIs and revenue period boundaries
- Missing authorization checks in new server actions leading to data exposure
- Lint/test debt hiding edge-case bugs in staff/finance/scanner modules

## Implementation Roadmap
### Phase 1 — Must Do (Security, Correctness, Baseline Performance)
- Central RBAC/ABAC policy checks applied across server actions
- zod validation integrated in all write actions
- Cookie flags enforced; add login rate limiting and CSRF checks where applicable
- Define business timezone and calendar rules; normalize date handling
- Add compound indexes on StudentSubscription, Payment, Attendance
- Cache dashboard aggregates; tighten select/include; add cursor pagination for feeds
- CI gates: tsc, eslint, test, build

## Critical Must‑Do Implementation Plan
### 1) Centralized Authorization (RBAC/ABAC)
- Objective
  - Ensure consistent, auditable authorization decisions across all server actions.
- Scope
  - Owner/Staff/Student/Admin server actions; shared helpers.
- Steps
  - Create policy module with role, resource, action, condition types (e.g., src/lib/auth/policy.ts).
  - Define policy matrix: actions permitted per role with libraryId/branchId scoping.
  - Implement permit(resource, action, subject, context) returning allow/deny with reason.
  - Wrap server actions with requirePermission calls before DB access.
  - Add audit log entries for critical allows/denies (payments, plan changes).
- Affected Files
  - src/actions/**, src/lib/auth/** (owner/staff/student/admin), prisma models for audit.
- Tests
  - Unit: permit() decisions for all roles/resources, edge conditions.
  - Integration: selected actions (finance, booking) reject unauthorized contexts.
- Observability
  - Structured logs for authorization decisions with correlation IDs.
- Rollout
  - Introduce policy module; incrementally apply to actions; enable strict mode after coverage reaches 100%.
- Risks & Mitigation
  - False denies: start in warn-only mode and compare results; maintain explicit allow exceptions.
- Acceptance Criteria
  - All server actions call centralized permit() before DB operations; tests green.

### 2) Zod Validation Everywhere
- Objective
  - Prevent invalid writes and sanitize inputs consistently.
- Scope
  - All write actions and sensitive reads.
- Steps
  - Create parseInput helper wrapping zod safeParse with error mapping.
  - Add validator schemas per domain (plan, subscription, payment, booking, staff ops).
  - Enforce validation at action boundaries before DB calls.
- Affected Files
  - src/lib/validators/**, src/actions/**.
- Tests
  - Unit: schema coverage for required/optional fields and coercions.
  - Integration: invalid inputs fail with consistent error responses.
- Observability
  - Log validation failures with resource/action tags.
- Acceptance Criteria
  - 100% write actions use zod; invalid inputs never reach DB.

### 3) Security Hardening (Cookies, Rate Limiting, CSRF)
- Objective
  - Reduce account takeover risk, brute force attempts, and request forgery.
- Scope
  - Session management, auth endpoints, public forms.
- Steps
  - Cookies: set Secure, HttpOnly, SameSite=strict in production; unify in session helper.
  - Rate limiting: IP+identifier limits with exponential backoff on login/reset; storage via Redis (prod) or in-memory (dev).
  - CSRF: anti-forgery token for any route not using server actions; validate token on POST.
- Affected Files
  - src/lib/auth/session.ts, src/actions/auth.ts, any API routes or form handlers.
- Tests
  - Unit: cookie flags in prod; limiter respects windows.
  - E2E: login throttling behavior; CSRF token required and validated.
- Observability
  - Metrics for auth success/failure rates; alerts on spikes.
- Acceptance Criteria
  - Cookie flags enforced; login throttled; CSRF validated where applicable.

### 4) Time Consistency (Business TZ, Week Start, UTC Storage)
- Objective
  - Ensure KPI ranges and finance periods are correct across time zones.
- Scope
  - Dashboard, finance, attendance, subscriptions.
- Steps
  - Define BUSINESS_TZ and WEEK_START in config.
  - Use date-fns with explicit options; convert inputs to UTC at storage boundary.
  - Normalize range builders and trend comparisons to shared utilities.
- Affected Files
  - src/actions/owner/dashboard.ts, finance.ts, subscriptions.ts; shared date utils.
- Tests
  - Unit: boundary cases across DST changes; week/month starts.
- Observability
  - Log range parameters and computed windows for auditability.
- Acceptance Criteria
  - All actions use shared range utilities; tests cover DST/edges; no mismatches observed.

### 5) Compound Indexes on Hot Paths
- Objective
  - Reduce query latency for subscriptions, payments, attendance.
- Scope
  - Prisma schema and migrations; query alignment.
- Steps
  - Add indexes:
    - StudentSubscription: (libraryId, branchId, status, endDate)
    - Payment: (libraryId, status, date, method) when method filtered/grouped
    - Attendance: (libraryId, branchId, checkIn)
  - Align queries to use indexed predicates; avoid unindexed sorts.
  - Run migration; verify with EXPLAIN ANALYZE on representative queries.
- Affected Files
  - prisma/schema.prisma; actions using these models.
- Tests
  - Performance checks; ensure correctness unchanged.
- Observability
  - Track query durations; alert if regressions.
- Acceptance Criteria
  - Key queries show improved latency; indexes present in DB; no correctness drift.

### 6) Dashboard Aggregates Caching + Pagination
- Objective
  - Cut cold SSR times and stabilize dashboard responsiveness.
- Scope
  - Owner dashboard metrics and activity feeds.
- Steps
  - Introduce cache layer keyed by libraryId/branchId/timeRange with TTL.
  - Revalidate on writes affecting metrics (payments, subscriptions).
  - Switch feeds to cursor-based pagination; limit fields via select/include.
- Affected Files
  - src/actions/owner/dashboard.ts and related list endpoints.
- Tests
  - Unit: cache hit/miss logic; invalidation triggers.
  - Integration: dashboard loads fast on cold; consistency after writes.
- Observability
  - Cache hit rate metrics; latency tracking.
- Acceptance Criteria
  - First-load latency reduced; metrics consistent; feeds paginate reliably.

### 7) CI Gates (Typecheck, Lint, Test, Build)
- Objective
  - Prevent regressions entering production.
- Scope
  - CI pipeline; repo scripts.
- Steps
  - Ensure npm run lint and npx tsc --noEmit are wired in CI.
  - Run tests (unit/integration/E2E) and build steps; fail fast on errors.
  - Add coverage thresholds and artifacts for logs.
- Affected Files
  - CI config, package.json scripts.
- Tests
  - Pipeline runs on PR; gates enforced.
- Observability
  - CI dashboards; alert on broken main.
- Acceptance Criteria
  - All gates required to pass before deploy; developers follow green-path workflow.

### Phase 2 — High Impact (Observability, Testing, User Experience)
- Structured logging with correlation IDs; Sentry + OpenTelemetry integrated
- Integration and E2E tests for core flows; establish coverage thresholds
- Precompute monthly revenue buckets; autosuspend and pool tuning in Neon
- Accessibility upgrades; mobile tables and trend labels

### Phase 3 — Strategic (Scale, Operations, Compliance)
- Transactions and idempotency for multi-entity operations
- Email queue; nightly reconciliation jobs; SLA tracking for support
- Archival strategy and optional partitioning for very large tables
- Feature flagging and plan-based overrides with audits
- Privacy tooling for data export/delete and consent preferences

## Appendix — Key Code References
- Prisma client init: [prisma.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/lib/prisma.ts)
- Datasource configuration: [schema.prisma](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L1-L10)
- Owner dashboard actions: [dashboard.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/owner/dashboard.ts)
- Plans, subscriptions, payments models: [schema.prisma](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L286-L527)
- Platform settings and audits: [admin/settings.ts](file:///c:/Users/insti/OneDrive/Desktop/library/src/actions/admin/settings.ts), [PlatformAuditLog](file:///c:/Users/insti/OneDrive/Desktop/library/prisma/schema.prisma#L894-L907)
