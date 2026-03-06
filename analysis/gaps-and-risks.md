# Orion - Gaps and Risks Analysis (Devil's Advocate)

> Critical assessment of the Orion job hunting tracker application.
> Last updated: 2026-02-09

---

## 1. Critical Security Vulnerabilities

### 1.1 CRITICAL: Authentication is Completely Broken (HIGH RISK)

**File:** `src/lib/auth/session.ts`

The `requireAuth()` function used by **every API route** (jobs, applications, interviews, dashboard) returns a **hardcoded mock user**:

```typescript
export async function getCurrentUser() {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@example.com',
    name: 'Dev User',
  };
}
```

**Impact:** Every API endpoint is effectively public. Any unauthenticated user can read, create, update, and delete any data. The ownership checks (`eq(jobs.userId, user.id)`) only filter by the mock user ID, meaning:
- All data created through these APIs belongs to the same fake user
- Real auth via NextAuth (`src/lib/auth.ts`) exists but is **never connected** to the API layer
- The middleware protects page routes but **explicitly excludes API routes** (matcher pattern: `/((?!api|_next/static|...).*)`), leaving all `/api/*` endpoints completely unprotected

**Root cause:** The `session.ts` file has a TODO comment from plan 01-02, suggesting the auth integration was planned but never completed. Meanwhile, real NextAuth is configured and used in some places (questionnaire API, user profile API use `auth()` from `@/lib/auth`), creating an inconsistent dual-auth system.

### 1.2 CRITICAL: Inconsistent Auth Strategy (HIGH RISK)

Two different auth mechanisms are used across the codebase:

| Endpoint | Auth Method | File |
|----------|-------------|------|
| Jobs, Applications, Interviews, Dashboard/stats | `requireAuth()` from `@/lib/auth/session` (mock) | Multiple API routes |
| Questionnaire, User Profile | `auth()` from `@/lib/auth` (real NextAuth) | `api/questionnaire/route.ts`, `api/user/profile/route.ts` |

This means some endpoints use real auth, others use fake auth. A user logged in via Google OAuth would see questionnaire data tied to their real user ID but jobs/applications tied to the hardcoded mock user ID.

### 1.3 SQL Injection via Search Parameter (MEDIUM RISK)

**File:** `src/app/api/jobs/route.ts:24-29`

```typescript
if (search) {
  conditions.push(
    or(
      ilike(jobs.title, `%${search}%`),
      ilike(jobs.company, `%${search}%`)
    )
  );
}
```

The `search` parameter is interpolated directly into ILIKE patterns without escaping special SQL pattern characters (`%`, `_`). While Drizzle ORM parameterizes the value (preventing classic SQL injection), the LIKE pattern characters `%` and `_` are **not escaped**, allowing pattern injection. A user could search for `%` and get all results, or use `_` as a wildcard.

### 1.4 No Input Sanitization for XSS (MEDIUM RISK)

User-supplied text fields (job descriptions, notes, cover letter content, interview feedback) are rendered with `whitespace-pre-wrap` but no sanitization. While React auto-escapes JSX, the `dangerouslySetInnerHTML` pattern is only one refactor away. More importantly, if this data is ever consumed by other systems (email notifications, exports, etc.), stored XSS becomes a risk.

### 1.5 No Rate Limiting (MEDIUM RISK)

No rate limiting exists on any API endpoint. An attacker could:
- Enumerate all UUIDs via brute force (though impractical with UUIDs)
- Spam job/application creation to exhaust database storage
- Launch DoS attacks against the dashboard stats endpoint (which performs multiple DB queries)

### 1.6 Hardcoded Database Credentials (LOW RISK)

**File:** `src/db/index.ts:6`

```typescript
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orion';
```

A fallback connection string with default credentials is hardcoded. If `DATABASE_URL` is accidentally unset in production, the app would attempt to connect to a local database with default credentials.

---

## 2. Missing Critical Functionality

### 2.1 No Jobs List Page (HIGH RISK)

There is no page component that renders a list of all jobs. The API endpoint `GET /api/jobs` exists with search/filter capabilities, and the `SearchFilter` and `JobCard` components exist, but there is **no page that composes them together**. Users can create jobs at `/jobs/new` and view individual jobs at `/jobs/[id]`, but there's no way to browse all jobs.

### 2.2 Empty Dashboard (HIGH RISK)

**File:** `src/app/(protected)/dashboard/page.tsx`

The dashboard is just a welcome message. It doesn't display:
- Dashboard statistics (despite a working `/api/dashboard/stats` endpoint)
- Recent jobs or applications
- Upcoming interviews
- Stale application alerts
- Any actionable information

The API is built but the UI never consumes it.

### 2.3 No Navigation System (HIGH RISK)

There is no shared navigation bar or sidebar. Each page either:
- Has its own minimal nav (`dashboard/page.tsx`, `profile/page.tsx`)
- Has no nav at all (`cover-letters/page.tsx`, `jobs/[id]/page.tsx`)

Users have no way to navigate between sections (Jobs, Applications, Cover Letters, Dashboard, Profile) without manually typing URLs. The `/cover-letters` page, for example, is completely unreachable from any other page.

### 2.4 No Application Management Page (MEDIUM RISK)

While the `GET /api/applications` endpoint exists, there's no dedicated page to list and manage applications separately from jobs. Users can only see application status embedded in the job detail view.

### 2.5 No Data Export (LOW RISK)

Job seekers often need to export their data for:
- Spreadsheet tracking (complementary workflow)
- Sharing with career coaches
- Backup before subscription expiry
- Compliance with data portability regulations (GDPR)

### 2.6 No Notifications or Reminders (MEDIUM RISK)

The "stale application" concept is computed but never proactively communicated. There's no:
- Email reminders for stale applications
- Interview reminders (upcoming interviews)
- Browser push notifications
- In-app notification center

### 2.7 Missing Account Deletion (MEDIUM RISK)

No way for users to delete their account or data, which is a GDPR requirement.

---

## 3. Potential Failure Points

### 3.1 Non-Atomic Job+Application Creation (HIGH RISK)

**File:** `src/app/api/jobs/route.ts:107-132`

```typescript
const [newJob] = await db.insert(jobs).values({...}).returning();
const [newApplication] = await db.insert(applications).values({...}).returning();
```

Job creation and auto-application creation are **two separate queries with no transaction**. If the application insert fails (e.g., constraint violation, connection drop), you'd have an orphaned job with no application. This violates the application's core invariant that every job should have an application.

### 3.2 Non-Atomic Status Change (HIGH RISK)

**File:** `src/app/api/applications/[id]/status/route.ts:58-82`

```typescript
// Log status change to history BEFORE updating application
await db.insert(statusHistory).values({...});

// Update application
const [updatedApp] = await db.update(applications).set(updateData)...
```

The status history insert and application update are separate queries with no transaction. If the update fails after the insert, status history will be inconsistent with the actual application status.

### 3.3 Race Conditions on Status Changes (MEDIUM RISK)

No optimistic locking or version checking exists. Two simultaneous status changes could:
1. Both read status as "applied"
2. Both insert history: "applied -> interviewing"
3. Both update to "interviewing"
4. Result: duplicate history entries

Or worse:
1. Request A reads status "applied"
2. Request B reads status "applied"
3. Request A updates to "interviewing"
4. Request B updates to "rejected"
5. History shows: applied->interviewing AND applied->rejected
6. Final status is whichever completed last, but history is inconsistent

### 3.4 Server-Side Fetch with Hardcoded localhost (MEDIUM RISK)

**File:** `src/app/(protected)/jobs/[id]/page.tsx:14`

```typescript
const response = await fetch(`http://localhost:3000/api/jobs/${id}`, {
  cache: 'no-store',
});
```

The job detail page fetches from `localhost:3000` during server-side rendering. This will:
- Fail in production unless the app runs on port 3000
- Fail in Docker containers where the hostname isn't `localhost`
- Fail in serverless environments (Vercel) where SSR doesn't go through HTTP
- Create a redundant HTTP round-trip instead of calling the database directly
- Bypass authentication (the fetch has no auth headers/cookies)

### 3.5 N+1 Query Pattern in Job Detail (LOW RISK)

**File:** `src/app/api/jobs/[id]/route.ts:22-48`

Three separate queries execute sequentially: fetch job, fetch application, fetch interviews. This should be a single joined query.

---

## 4. Edge Cases Not Handled

### 4.1 Multiple Applications Per Job (HIGH RISK)

The schema allows multiple applications per job (no unique constraint on `jobId` in applications table). The `leftJoin` in the jobs list query would produce **duplicate job rows** if a job has multiple applications. The `GET /api/jobs/[id]` endpoint uses `.limit(1)` for the application, silently dropping additional applications.

### 4.2 Cover Letter Deletion Race (LOW RISK)

When deleting a cover letter, the code first unlinks from applications then deletes. If a new application links to the cover letter between the unlink and delete operations, that application will have a dangling reference.

### 4.3 UUID Parameter Validation (MEDIUM RISK)

No API endpoint validates that the `id` path parameter is a valid UUID. Passing a non-UUID string like `/api/jobs/not-a-uuid` will cause a database error rather than a clean 400 response. This leaks internal error details.

### 4.4 Empty String vs Null Confusion (LOW RISK)

The `updateApplicationSchema` allows `notes: z.string().optional()` and the API checks `if (data.notes !== undefined)`. But there's no way to **clear** a field by setting it to `null` or empty string. Once set, fields can only be changed to other non-empty values.

### 4.5 Timezone Handling (MEDIUM RISK)

Interview `scheduledAt` uses `datetime-local` input (no timezone) and converts with `new Date(scheduledAt).toISOString()`. This creates timezone ambiguity:
- The user enters "2:00 PM" meaning their local time
- `new Date()` in the browser interprets it in the browser's timezone
- The ISO string is stored in UTC
- When displayed back, `toLocaleString()` converts to the viewer's local timezone
- If the user travels or uses multiple devices in different timezones, interview times will appear wrong

### 4.6 Questionnaire Data Loss on 0 Years Experience (LOW RISK)

**File:** `src/components/questionnaire/QuestionnaireForm.tsx:323`

```typescript
onChange={(e) => setYearsExperience(e.target.value ? parseInt(e.target.value) : null)}
```

Selecting "0-1 years" (value="0") and then reloading the page will lose the selection because `data.yearsExperience || null` evaluates `0` as falsy, resetting to `null`.

---

## 5. User Experience Concerns

### 5.1 No Loading States or Skeletons (MEDIUM RISK)

Most pages show plain "Loading..." text. There are no skeleton loaders, shimmer effects, or meaningful loading indicators. The dashboard has no loading state at all since it doesn't fetch any dynamic data.

### 5.2 No Empty State Guidance (MEDIUM RISK)

When a user first logs in, the dashboard says "Welcome back" but doesn't guide them to:
- Add their first job
- Complete their profile
- Fill out the questionnaire

The onboarding flow is absent.

### 5.3 No Confirmation for Destructive Actions (LOW RISK)

Job deletion (`DELETE /api/jobs/[id]`) cascades to delete all applications, interviews, and status history but:
- There's no delete button in the UI (only the API exists)
- When delete is eventually added, the cascade needs prominent warning
- Cover letter and interview deletes use browser `confirm()` which is blocking and non-stylable

### 5.4 No Undo/Redo (LOW RISK)

Status changes are immediate and irreversible. No undo functionality exists for any operation.

### 5.5 No Mobile Responsiveness Concerns (MEDIUM RISK)

The `SearchFilter` component uses `min-w-[200px]` flex items that may not stack properly on small screens. The questionnaire checkbox grid uses `grid-cols-2` which may be too cramped on mobile. No mobile-specific testing or responsive breakpoints are evident beyond basic Tailwind.

### 5.6 Form Data Loss on Navigation (MEDIUM RISK)

The `JobForm`, `InterviewForm`, and `CoverLetterForm` don't warn users about unsaved changes before navigating away. Accidentally clicking "Back" or a link loses all form input.

---

## 6. Scalability Limitations

### 6.1 No Pagination (HIGH RISK)

**All list endpoints** return unbounded result sets:
- `GET /api/jobs` - returns ALL jobs
- `GET /api/applications` - returns ALL applications
- `GET /api/interviews` - returns ALL interviews
- `GET /api/cover-letters` - returns ALL cover letters

An active job seeker with 200+ tracked jobs will experience:
- Slow API responses
- High memory usage
- Slow rendering

### 6.2 Dashboard Stats - Full Table Scan (MEDIUM RISK)

**File:** `src/app/api/dashboard/stats/route.ts`

The dashboard stats endpoint fetches ALL applications for a user into memory, then filters in JavaScript. With many applications, this becomes slow and memory-intensive. The query also makes a second database call for status history. This should be a single aggregation query.

### 6.3 No Database Connection Pooling Configuration (MEDIUM RISK)

**File:** `src/db/index.ts`

The `postgres` client is created at module level with no connection pool size configuration. In serverless environments, this creates a new connection per invocation. In long-running environments, a single connection may bottleneck concurrent requests.

### 6.4 No Caching Strategy (LOW RISK)

No caching exists at any level:
- No HTTP cache headers on API responses
- No in-memory caching for frequently accessed data
- No stale-while-revalidate patterns
- The job detail page explicitly sets `cache: 'no-store'`

### 6.5 Cover Letters Stored as Raw Text (LOW RISK)

Cover letter content is stored as a plain text column with no size limit. Very large cover letters could degrade performance. There's no content size validation.

---

## 7. Incomplete or Inconsistent Features

### 7.1 Questionnaire Exists but Is Never Used (HIGH RISK)

The user questionnaire collects:
- Technical skills
- Preferred roles
- Preferred industries
- Years of experience
- Career goals

But this data is **never consumed by anything**. No feature uses it for job matching, recommendations, or filtering. The questionnaire page itself (`/questionnaire`) doesn't appear to have a page component - only the API and form component exist. The feature feels abandoned.

### 7.2 Job Feedback Table Exists but Has No API or UI (MEDIUM RISK)

`jobFeedback` table is defined in the schema with a complete relation setup but:
- No API endpoint exists for it
- No UI component references it
- No feature uses it

### 7.3 isTemplate Flag on Cover Letters Unused (LOW RISK)

The `coverLetters` schema has an `isTemplate` boolean field, but:
- No API endpoint reads or writes it
- No UI distinguishes between templates and one-off letters
- The cover letter creation API doesn't accept an `isTemplate` parameter

### 7.4 Job Source Field Has No UI (LOW RISK)

The `jobs` schema has a `source` field ("LinkedIn", "Indeed", etc.) that:
- Is accepted in the create job validation schema
- Is not exposed in the `JobForm` component
- Cannot be set by users through the UI

### 7.5 Profile Form Missing Fields (MEDIUM RISK)

The user profile page only exposes 4 of 11 profile fields:
- Shown: name, email (read-only), salaryMin, salaryMax, workPreference
- Missing from UI: title, location, phone, linkedinUrl, githubUrl, portfolioUrl, resume, bio

### 7.6 Cover Letter Not Linked to Jobs (LOW RISK)

The `coverLetters` table has a `jobId` FK, but the cover letter creation API and form don't support associating a cover letter with a specific job. Cover letters can only be linked to applications, not directly to the job they were written for.

### 7.7 DragAndDrop Hook Unused (LOW RISK)

`src/lib/hooks/useDragAndDrop.ts` exists but is not imported anywhere. It appears to be scaffolding for a Kanban board feature that was never built.

---

## 8. Technical Debt

### 8.1 `any` Types Everywhere (MEDIUM RISK)

Multiple files use `any` type for:
- Database update objects (`const updateData: any = {...}`)
- Query condition arrays (`const conditions: any[] = [...]`)
- Interview type casting in JSX (`interview: any`)
- Form payloads (`const payload: any = {...}`)

This defeats TypeScript's type safety, making bugs harder to catch at compile time.

### 8.2 No Test Suite (HIGH RISK)

Zero tests exist:
- No unit tests
- No integration tests
- No E2E tests
- No `jest.config`, `vitest.config`, or `playwright.config`
- No test scripts in `package.json`

### 8.3 No Error Boundary (MEDIUM RISK)

No React error boundaries exist. An unhandled error in any component crashes the entire page with no recovery option.

### 8.4 Console.error for Error Logging (LOW RISK)

All API error handling uses `console.error()`. In production, this:
- Has no structured logging
- No error aggregation (Sentry, DataDog, etc.)
- No alerting capability
- Logs are lost in serverless environments

### 8.5 No Environment Validation (MEDIUM RISK)

No startup validation ensures required environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `NEXTAUTH_SECRET`) are set. Missing vars cause runtime crashes with confusing errors instead of clear startup failures.

### 8.6 Stale Migration Files (LOW RISK)

`drizzle/0002_questionnaire_update.sql` is listed as untracked in git. Uncommitted migration files suggest schema changes that may not be properly tracked or deployable.

---

## 9. Prioritized Risk Summary

### HIGH RISK (Must Fix Before Any Deployment)

| # | Issue | Category |
|---|-------|----------|
| 1 | Authentication is broken - all APIs use mock user | Security |
| 2 | Inconsistent auth (some endpoints real, some fake) | Security |
| 3 | No navigation system - app is unusable | UX |
| 4 | No jobs list page despite having components | Missing Feature |
| 5 | Empty dashboard - no stats, no data | Missing Feature |
| 6 | Non-atomic job+application creation | Data Integrity |
| 7 | Non-atomic status change with history | Data Integrity |
| 8 | Hardcoded localhost fetch in SSR | Reliability |
| 9 | No pagination on any list endpoint | Scalability |
| 10 | No test suite whatsoever | Quality |
| 11 | Multiple applications per job causes duplicates | Data Integrity |

### MEDIUM RISK (Should Fix Before Beta)

| # | Issue | Category |
|---|-------|----------|
| 12 | No rate limiting on API endpoints | Security |
| 13 | LIKE pattern injection in search | Security |
| 14 | Race conditions on concurrent status changes | Data Integrity |
| 15 | UUID parameter validation missing | Reliability |
| 16 | Timezone handling for interviews | Data Correctness |
| 17 | No input validation on questionnaire API | Security |
| 18 | No loading states or skeletons | UX |
| 19 | No onboarding flow for new users | UX |
| 20 | Form data loss on navigation | UX |
| 21 | Mobile responsiveness gaps | UX |
| 22 | Dashboard stats does full table scan | Performance |
| 23 | `any` types throughout codebase | Maintainability |
| 24 | No error boundaries | Reliability |
| 25 | No environment variable validation | Reliability |
| 26 | Questionnaire data never used | Incomplete Feature |
| 27 | Profile form missing most fields | Incomplete Feature |
| 28 | Job feedback table has no API/UI | Dead Code |
| 29 | No application management page | Missing Feature |
| 30 | No notifications or reminders | Missing Feature |
| 31 | No account deletion (GDPR) | Compliance |

### LOW RISK (Nice to Have / Future Improvement)

| # | Issue | Category |
|---|-------|----------|
| 32 | Hardcoded DB fallback credentials | Security |
| 33 | Cover letter deletion race condition | Data Integrity |
| 34 | Empty string vs null confusion in updates | Data Correctness |
| 35 | 0 years experience data loss | Bug |
| 36 | No confirmation for destructive cascading deletes | UX |
| 37 | No undo/redo | UX |
| 38 | No caching strategy | Performance |
| 39 | Cover letter content has no size limit | Performance |
| 40 | Console.error for production logging | Observability |
| 41 | isTemplate flag unused | Dead Code |
| 42 | Job source field not in UI | Incomplete Feature |
| 43 | Cover letters not linked to specific jobs | Incomplete Feature |
| 44 | DragAndDrop hook unused | Dead Code |
| 45 | Stale migration file untracked | DevOps |
| 46 | No data export functionality | Missing Feature |
| 47 | No database connection pool config | Scalability |

---

## 10. Key Assumptions Challenged

| Assumption | Challenge |
|------------|-----------|
| "Google OAuth is sufficient as the only auth provider" | Users without Google accounts are locked out. Enterprise users may need SSO/SAML. Email/password is the most universal option. |
| "One application per job" | The schema doesn't enforce this. Users may reapply to the same company for the same role after rejection. |
| "Text fields are sufficient for requirements/skills" | Structured data (JSON arrays) would enable matching, filtering, and analytics. Storing as text strings limits future intelligence features. |
| "Status is linear (saved -> applied -> interviewing -> offered/rejected)" | The code allows any status transition, which is good, but the UI presents it as a linear dropdown without visualizing the actual workflow. Withdrawals, deferrals, and re-engagements aren't modeled. |
| "Single user per session" | No multi-account or team/recruiter features. Career coaches helping multiple clients can't use this. |
| "Browser timezone is sufficient" | Interview times should be stored with explicit timezone or always in UTC with user's preferred timezone for display. |
