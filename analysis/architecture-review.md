# Orion - Technical Architecture Review

**Date:** 2026-02-09
**Reviewer:** Technical Architect Agent
**Application:** Orion - AI-powered Job Hunt Assistant
**Stack:** Next.js 15 + React 19 + Drizzle ORM + PostgreSQL + NextAuth v5

---

## 1. Architectural Overview

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.2.0 |
| UI Library | React | 19.0.0 |
| Language | TypeScript | 5.x (strict mode) |
| ORM | Drizzle ORM | 0.45.1 |
| Database | PostgreSQL (via postgres.js) | - |
| Authentication | NextAuth v5 (Auth.js beta) | 5.0.0-beta.30 |
| Validation | Zod | 4.3.6 |
| Styling | Tailwind CSS | 3.4.1 |
| Icons | Lucide React | 0.563.0 |

### Application Structure

```
src/
  app/
    (auth)/login/         # Public auth pages
    (protected)/          # Authenticated route group
      dashboard/          # Main dashboard
      profile/            # User profile
      jobs/               # Job listing and detail
        [id]/             # Job detail + interviews
      cover-letters/      # Cover letter management
    api/                  # API routes
      auth/[...nextauth]/ # NextAuth handler
      applications/       # CRUD + status management
      cover-letters/      # CRUD
      dashboard/stats/    # Statistics aggregation
      interviews/         # CRUD
      jobs/               # CRUD with search/filter
      questionnaire/      # Onboarding questionnaire
      user/profile/       # User profile management
  components/             # React components by domain
  db/                     # Database connection + schema
  lib/
    auth.ts               # NextAuth configuration
    auth/session.ts       # Session helpers (PLACEHOLDER)
    hooks/                # Custom React hooks
    utils/                # Utility functions
    validations/          # Zod validation schemas
  middleware.ts           # Route protection
  types/                  # TypeScript declarations
```

### Data Model (Entity Relationships)

```
User (1) ---- (*) Job
  |                |
  |                +---- (1) Application ---- (*) Interview
  |                |         |
  |                |         +---- (*) StatusHistory
  |                |         |
  |                |         +---- (0..1) CoverLetter
  |                |
  |                +---- (*) JobFeedback
  |
  +---- (*) CoverLetter
  +---- (1) UserQuestionnaire
  +---- (*) Account (OAuth)
  +---- (*) Session
```

---

## 2. Strengths and Good Patterns

### 2.1 Database Design

- **Well-normalized schema** with proper foreign key relationships and cascade deletes
- **UUID primary keys** prevent enumeration attacks and are safe for distributed systems
- **Comprehensive indexing strategy** on `userId`, `jobId`, `applicationId`, `status`, `scheduledAt`, and `company` columns
- **PostgreSQL enums** (`applicationStatusEnum`, `interviewTypeEnum`, etc.) enforce data integrity at the DB level
- **Drizzle relations** are well-defined, enabling the relational query builder for complex joins
- **Status history table** provides a complete audit trail of application status changes - this is an excellent architectural decision for a tracking app

### 2.2 Authentication Architecture

- **NextAuth v5 with Drizzle adapter** is the right choice - fully integrated with the ORM
- **Middleware-based route protection** (`src/middleware.ts`) using the Auth.js middleware pattern
- **Session callback** correctly injects `user.id` into the session object
- **Custom type augmentation** (`types/next-auth.d.ts`) extends the session type properly
- **Route group separation** `(auth)` vs `(protected)` is a clean Next.js pattern

### 2.3 API Design

- **Consistent REST patterns** across all routes (GET list, GET by id, POST create, PUT update, DELETE)
- **Zod validation** on all write operations with proper error formatting
- **Ownership verification** on every API call - resources are always filtered by `userId`
- **Optimistic updates** in the `StatusSelect` component with rollback on error
- **Status change endpoint** is a separate `PATCH /applications/[id]/status` - good separation from general updates
- **Auto-application creation** when saving a job (POST /api/jobs) reduces friction

### 2.4 Code Organization

- **Clean separation of concerns**: validation schemas in `lib/validations/`, auth in `lib/auth/`, utils in `lib/utils/`
- **Component colocation by domain**: `components/jobs/`, `components/applications/`, etc.
- **TypeScript strict mode enabled** in `tsconfig.json`
- **Consistent error handling pattern** across all API routes (try/catch with console.error + JSON error response)
- **Drizzle connection configured for pooling** with `prepare: false` (compatible with connection poolers like PgBouncer)

### 2.5 Frontend Patterns

- **URL-first workflow** in the job form - practical UX decision for job hunters
- **Debounced search** (300ms) in `SearchFilter` with URL state synchronization
- **"Stale" application detection** is a clever domain-specific feature (14-day threshold)
- **Server Components where possible** (dashboard page, job detail page) for performance
- **Client components marked with `'use client'`** only where needed

---

## 3. Weaknesses and Technical Debt

### 3.1 Critical: Broken Auth Session Helper

**File:** `src/lib/auth/session.ts`
**Severity:** CRITICAL

```typescript
export async function getCurrentUser() {
  // TODO: Replace with actual NextAuth session check in 01-02
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@example.com',
    name: 'Dev User',
  };
}
```

**Impact:** All API routes that use `requireAuth()` from `session.ts` return a hardcoded mock user. This means:
- **Jobs, Applications, Interviews, Cover Letters, Dashboard Stats** routes all bypass authentication entirely
- Any unauthenticated user can access all data
- All data is attributed to the same mock user ID

**Affected routes:** ALL except `/api/questionnaire` and `/api/user/profile` (which correctly use `auth()` from `@/lib/auth`)

**Fix:** Replace `getCurrentUser()` to use the actual NextAuth `auth()` function:
```typescript
import { auth } from '@/lib/auth';

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
```

### 3.2 Inconsistent Authentication Pattern

Two different auth patterns are used across the API:

| Pattern | Used In | Source |
|---------|---------|--------|
| `requireAuth()` from `@/lib/auth/session` | jobs, applications, interviews, cover-letters, dashboard/stats | Returns mock user (BROKEN) |
| `auth()` from `@/lib/auth` | questionnaire, user/profile | Returns real session (CORRECT) |

This inconsistency is dangerous and confusing. All routes should use a single, unified pattern.

### 3.3 Middleware Does Not Protect API Routes

**File:** `src/middleware.ts`

The matcher pattern explicitly **excludes** API routes:
```typescript
matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
```

This means API routes rely entirely on their own authentication checks. Combined with the broken `requireAuth()`, this leaves most API routes completely unprotected.

**Recommendation:** Add API route protection to the middleware, or ensure all API routes use the real `auth()` function and return 401 for unauthenticated requests.

### 3.4 Missing Protected Routes in Middleware

The middleware only protects three route prefixes:
```typescript
const protectedRoutes = ['/dashboard', '/profile', '/jobs'];
```

**Missing:** `/cover-letters` - this page would be accessible without authentication at the middleware level (though the API calls within it would fail if auth is working correctly).

### 3.5 Excessive Use of `any` Type

Multiple locations use `any` to avoid proper typing:

| File | Location | Issue |
|------|----------|-------|
| `api/jobs/route.ts:21` | `conditions: any[]` | Should use Drizzle's `SQL` type |
| `api/applications/route.ts:18` | `conditions: any[]` | Same issue |
| `api/applications/[id]/route.ts:107` | `updateData: any` | Should use partial schema type |
| `api/applications/[id]/status/route.ts:67` | `updateData: any` | Same issue |
| `api/interviews/[id]/route.ts:113` | `updateData: any` | Same issue |
| `api/cover-letters/[id]/route.ts:117` | `updateData: any` | Same issue |
| `api/questionnaire/route.ts:8,132` | `data: any` | Should use schema inference |
| `jobs/[id]/page.tsx:134` | `interview: any` | Should define interview type |
| `lib/hooks/useDragAndDrop.ts:8` | `data: any` | Should use generic type |

### 3.6 N+1 Query Patterns

**File:** `api/applications/[id]/route.ts` - The GET handler makes 4 sequential database queries:
1. Fetch application
2. Fetch job
3. Fetch interviews
4. Fetch status history

**File:** `api/jobs/[id]/route.ts` - The GET handler makes 3 sequential queries:
1. Fetch job
2. Fetch application
3. Fetch interviews

These could be replaced with Drizzle's relational query builder (`db.query.applications.findFirst({ with: { ... } })`) or consolidated into fewer queries using joins.

### 3.7 Missing Pagination

All list endpoints return **all** records:
- `GET /api/jobs` - All jobs for user
- `GET /api/applications` - All applications for user
- `GET /api/interviews` - All interviews for user
- `GET /api/cover-letters` - All cover letters for user

For a user actively job hunting with hundreds of entries, this will degrade performance. All list endpoints need `limit` and `offset` (or cursor-based pagination).

### 3.8 Status Casting Without Validation

**File:** `api/jobs/route.ts:33`
```typescript
conditions.push(eq(applications.status, status as any));
```

The `status` query parameter is cast to `any` without validation. It should be validated against the enum values before use.

### 3.9 Hardcoded localhost URL

**File:** `src/app/(protected)/jobs/[id]/page.tsx:14`
```typescript
const response = await fetch(`http://localhost:3000/api/jobs/${id}`, {
  cache: 'no-store',
});
```

This will fail in any non-local environment. Server components should use the database directly (or use relative URLs with proper headers forwarding), not make HTTP requests to `localhost`.

### 3.10 Non-Atomic Status Change

**File:** `api/applications/[id]/status/route.ts`

The status change operation performs two separate DB operations (insert history + update application) without a transaction:
```typescript
await db.insert(statusHistory).values({...});
const [updatedApp] = await db.update(applications).set(updateData)...
```

If the second operation fails, the history record will exist without the corresponding status change. This should be wrapped in a `db.transaction()`.

### 3.11 Non-Atomic Job Creation

**File:** `api/jobs/route.ts`

Job creation followed by auto-application creation are two separate operations:
```typescript
const [newJob] = await db.insert(jobs).values({...}).returning();
const [newApplication] = await db.insert(applications).values({...}).returning();
```

If application creation fails, an orphan job exists without an application. Wrap in a transaction.

---

## 4. Security Considerations

### 4.1 SQL Injection via ILIKE

**File:** `api/jobs/route.ts:24-28`
```typescript
ilike(jobs.title, `%${search}%`)
```

While Drizzle ORM parameterizes queries, the `%` wildcards in the search string are part of the template literal. If the user includes `%` or `_` characters in their search, it could match unintended patterns. Consider escaping LIKE special characters:
```typescript
const escapedSearch = search.replace(/[%_]/g, '\\$&');
```

### 4.2 No Rate Limiting

No rate limiting exists on any API route. Critical routes that should be rate-limited:
- `POST /api/jobs` - Resource creation
- `PATCH /api/applications/[id]/status` - Status changes
- `PUT /api/questionnaire` - Profile updates
- `POST /api/interviews` - Resource creation
- Authentication endpoints

### 4.3 No CSRF Protection on API Routes

While NextAuth handles CSRF for its own routes, the application's API routes (`/api/jobs`, `/api/applications`, etc.) have no CSRF protection. Since cookies are used for session management, API routes are vulnerable to CSRF attacks.

**Mitigation:** Either:
- Verify the `Origin` header matches the application domain
- Use NextAuth's CSRF token on all API calls
- Add `SameSite=Strict` to session cookies

### 4.4 No Input Sanitization on Text Fields

Free-text fields like `description`, `requirements`, `notes`, `careerGoals`, and `content` (cover letters) are stored and displayed without sanitization. While React escapes HTML by default, if these values are ever rendered via `dangerouslySetInnerHTML` or used in emails, they could be vectors for XSS or injection.

### 4.5 Missing UUID Validation on Path Parameters

API routes accept `id` parameters from the URL path but don't validate they are valid UUIDs before passing them to database queries:
```typescript
const { id } = await context.params;
// id is used directly in queries without UUID format validation
```

Invalid UUIDs will cause database errors rather than clean 400 responses.

### 4.6 Sensitive Data Exposure

The `accounts` table stores OAuth tokens (`access_token`, `refresh_token`, `id_token`) in plain text. While these are managed by NextAuth's adapter, consider:
- Encrypting tokens at rest
- Ensuring these columns are never exposed via API responses
- Setting appropriate database-level column permissions

### 4.7 Missing Content Security Policy

No CSP headers are configured. For a production application, add security headers:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)

This can be done via `next.config.js` headers configuration.

---

## 5. Performance Optimization Opportunities

### 5.1 Database Query Optimization

**Dashboard Stats Endpoint** (`api/dashboard/stats/route.ts`):
- Fetches ALL applications, then filters in JavaScript for 6 different metrics
- Makes an additional query to `statusHistory` for the interviewed count
- **Optimization:** Use SQL aggregations (`COUNT FILTER WHERE`, `GROUP BY`) to compute all stats in a single query

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'saved') as jobs_in_queue,
  COUNT(*) FILTER (WHERE status NOT IN ('rejected', 'offered')) as total_active,
  COUNT(*) FILTER (WHERE status IN ('applied', 'interviewing', 'offered', 'rejected')) as total_applied,
  COUNT(*) FILTER (WHERE status IN ('interviewing', 'offered', 'rejected')) as total_responses,
  COUNT(*) FILTER (WHERE status = 'applied' AND updated_at < NOW() - INTERVAL '14 days') as stale_jobs
FROM applications WHERE user_id = $1;
```

### 5.2 Application-Level Sorting

**File:** `api/jobs/route.ts:70-77`
Jobs are sorted in JavaScript after fetching:
```typescript
jobsWithStale.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

This should be done in the database query using `ORDER BY` for better performance with large datasets.

### 5.3 Missing Database Indexes

While the current indexes are good, consider adding:
- **Composite index** on `(user_id, status)` for `applications` table (the most common filter combination)
- **Composite index** on `(user_id, created_at)` for `jobs` table (default sort order)
- **Index** on `cover_letters.title` if title uniqueness checks become a bottleneck

### 5.4 No Connection Pooling Configuration

**File:** `src/db/index.ts`
```typescript
const client = postgres(connectionString, { prepare: false });
```

The `postgres.js` driver creates connections but there's no explicit pool configuration (`max`, `idle_timeout`, etc.). For production, configure:
```typescript
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

### 5.5 No Caching Strategy

No caching exists at any level:
- No HTTP cache headers on API responses
- No `revalidate` configuration on Server Components
- No in-memory caching for frequently accessed data (e.g., dashboard stats)

For the dashboard stats endpoint (called on every dashboard load), consider:
- `Cache-Control: private, max-age=60` (1-minute client cache)
- React Server Component ISR with `revalidate` option
- SWR or React Query for client-side stale-while-revalidate

### 5.6 Unbounded Text Fields

Several columns use `text()` without length constraints:
- `description`, `requirements`, `niceToHaves` on jobs table
- `content` on cover letters table
- `notes` on multiple tables

A single cover letter or job description could be megabytes in size. Consider adding application-level length limits via Zod validation.

---

## 6. Recommended Architectural Improvements

### 6.1 Priority 1: Fix Authentication (Critical)

1. **Replace `src/lib/auth/session.ts`** with real NextAuth integration
2. **Unify auth pattern** - all routes should use the same `requireAuth()` that calls `auth()`
3. **Add API route protection** to middleware or ensure every route validates the session
4. **Add `/cover-letters` to protected routes** in middleware

### 6.2 Priority 2: Add Database Transactions

Wrap multi-step database operations in transactions:
- Job creation + auto-application creation
- Status change + history logging
- Cover letter deletion + application unlinking

```typescript
await db.transaction(async (tx) => {
  await tx.insert(statusHistory).values({...});
  await tx.update(applications).set({...}).where(...);
});
```

### 6.3 Priority 3: Add Pagination

Implement cursor-based or offset pagination on all list endpoints:
```typescript
// Query params
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
const offset = (page - 1) * limit;

// In query
.limit(limit).offset(offset)

// In response
return NextResponse.json({
  data: results,
  pagination: { page, limit, total: count }
});
```

### 6.4 Priority 4: Centralize Error Handling

Create a unified API error handler to reduce boilerplate:

```typescript
// lib/api/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function withErrorHandler(handler: Function) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      console.error('Unhandled error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
```

### 6.5 Priority 5: Use Drizzle Relational Queries

Replace manual multi-query patterns with Drizzle's relational query builder:

```typescript
// Instead of 4 sequential queries
const application = await db.query.applications.findFirst({
  where: and(eq(applications.id, id), eq(applications.userId, user.id)),
  with: {
    job: true,
    interviews: { orderBy: interviews.scheduledAt },
    statusHistory: { orderBy: desc(statusHistory.changedAt) },
  },
});
```

### 6.6 Priority 6: Add Input Validation to All Routes

Currently, `/api/questionnaire` and `/api/user/profile` do manual validation instead of using Zod. All routes should use Zod consistently:

```typescript
// lib/validations/questionnaire.ts
export const updateQuestionnaireSchema = z.object({
  technicalSkills: z.array(z.string()).optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredIndustries: z.array(z.string()).optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  careerGoals: z.string().max(5000).optional(),
});
```

### 6.7 Priority 7: Fix Server Component Data Fetching

Replace the `localhost` fetch in `jobs/[id]/page.tsx` with direct database access:

```typescript
import { db } from '@/db';
import { auth } from '@/lib/auth';

async function getJob(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.query.jobs.findFirst({
    where: and(eq(jobs.id, id), eq(jobs.userId, session.user.id)),
    with: { applications: { with: { interviews: true } } },
  });
}
```

---

## 7. Missing Technical Features and Patterns

### 7.1 No Testing Infrastructure

- No test framework configured (no Jest, Vitest, or Playwright)
- No unit tests for validation schemas, utility functions, or API routes
- No integration tests for database operations
- No E2E tests for user flows

**Recommended:** Add Vitest for unit/integration tests and Playwright for E2E testing.

### 7.2 No Error Boundary

No React error boundaries exist. Client-side JavaScript errors will crash the entire page. Add:
- A root `error.tsx` in the app directory
- Per-route `error.tsx` files for graceful degradation
- `loading.tsx` files for Suspense boundaries

### 7.3 No Logging Infrastructure

All error logging uses `console.error`. For production:
- Use a structured logging library (e.g., Pino, Winston)
- Log request IDs for traceability
- Send errors to an error tracking service (e.g., Sentry)

### 7.4 No API Documentation

No OpenAPI/Swagger documentation exists. For a growing API, consider:
- Adding JSDoc to API route exports
- Generating OpenAPI specs from Zod schemas
- Using `zod-openapi` or similar tools

### 7.5 No Data Export/Import

Users cannot export their job tracking data. For a personal productivity tool, this is important:
- Export to CSV/JSON
- Data portability compliance

### 7.6 No Soft Deletes

All delete operations are hard deletes. For a tracking application where users might accidentally delete records:
- Add a `deletedAt` column for soft deletes
- Filter out soft-deleted records in queries
- Provide an "undo" or "trash" feature

### 7.7 No Optimistic Concurrency Control

No `updatedAt` checks on write operations. If two browser tabs edit the same record simultaneously, the last write wins silently. Consider:
- Sending `updatedAt` with update requests
- Checking it matches before updating
- Returning 409 Conflict if stale

### 7.8 No Webhook or Notification System

For a job tracking app, notifications would be valuable:
- Email reminders for stale applications
- Interview reminders (day before, hour before)
- Status change notifications

### 7.9 No Shared Layout for Protected Routes

The `(protected)` route group doesn't have a shared layout with navigation. Each page (dashboard, profile, jobs) must implement its own nav bar. A shared layout at `(protected)/layout.tsx` should include:
- Navigation sidebar or top bar
- Breadcrumbs
- User menu
- Responsive layout

### 7.10 No Environment Variable Validation

Environment variables like `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are used without validation at startup. Use a validation approach:
```typescript
// lib/env.ts
import { z } from 'zod';
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
});
export const env = envSchema.parse(process.env);
```

### 7.11 No Database Migration Strategy for Production

While Drizzle Kit is configured for development (`db:generate`, `db:push`), there's no production migration strategy:
- No migration CI/CD pipeline
- No rollback procedures
- No seeding scripts for initial data

### 7.12 Missing `updatedAt` Auto-Update

The `updatedAt` columns across all tables are manually set in code:
```typescript
updatedAt: new Date(),
```

This is error-prone. Consider using a PostgreSQL trigger or Drizzle's `.$onUpdate()` feature to automatically set `updatedAt` on every update.

---

## Summary of Priorities

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | Fix auth session helper (mock user) | Security: All data unprotected | Low |
| P0 | Unify authentication pattern across all routes | Security: Inconsistent protection | Low |
| P1 | Add database transactions | Data integrity | Low |
| P1 | Fix hardcoded localhost URL | Broken in production | Low |
| P1 | Add missing `/cover-letters` to middleware | Security gap | Trivial |
| P2 | Add pagination to list endpoints | Performance at scale | Medium |
| P2 | Optimize dashboard stats query | Performance | Medium |
| P2 | Add UUID validation on path params | Error handling | Low |
| P2 | Add security headers (CSP, HSTS, etc.) | Security hardening | Low |
| P3 | Use Drizzle relational queries | Code quality, performance | Medium |
| P3 | Centralize error handling | Maintainability | Medium |
| P3 | Add testing infrastructure | Reliability | High |
| P3 | Add shared protected layout | UX, code reuse | Medium |
| P3 | Environment variable validation | Reliability | Low |
| P4 | Add rate limiting | Security | Medium |
| P4 | Structured logging | Observability | Medium |
| P4 | Soft deletes | Data safety | Medium |
| P4 | Notification system | Feature completeness | High |
