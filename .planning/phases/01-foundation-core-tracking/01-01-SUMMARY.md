---
phase: 01-foundation-core-tracking
plan: 01
subsystem: infrastructure
tags: [nextjs, postgresql, drizzle-orm, database, setup, foundation]

dependency_graph:
  requires: []
  provides:
    - Next.js 15 application foundation
    - PostgreSQL database with Docker
    - Complete Drizzle ORM schema for all Phase 1 entities
    - Database client and migrations
  affects:
    - 01-02 (NextAuth depends on users/accounts/sessions tables)
    - 01-03 (Job/Application UI depends on schema)
    - 02-* (All Phase 2 features depend on this data layer)

tech_stack:
  added:
    - next@15.2.0
    - react@19.0.0
    - drizzle-orm@0.45.1
    - postgres@3.4.8
    - drizzle-kit@0.31.8
    - next-auth@5.0.0-beta.30
    - @auth/drizzle-adapter@1.11.1
    - tailwindcss@3.4.1
    - clsx@2.1.1
    - tailwind-merge@3.4.0
    - lucide-react@0.563.0
    - date-fns@4.1.0
  patterns:
    - Next.js App Router
    - Drizzle ORM schema-first database modeling
    - PostgreSQL with Docker containerization
    - Type-safe database queries with Drizzle

key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - tailwind.config.ts
    - docker-compose.yml
    - drizzle.config.ts
    - src/db/schema.ts
    - src/db/index.ts
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - .env.example
  modified: []

decisions:
  - what: Use Next.js 15 with App Router and src directory
    why: Modern React patterns, file-based routing, server components
    impact: All UI components will use App Router conventions

  - what: Use Drizzle ORM over Prisma
    why: Better TypeScript inference, more SQL-like, smaller bundle
    impact: Schema defined in TypeScript, type-safe queries

  - what: Use PostgreSQL 16 with Docker
    why: Production-grade relational database, easy local setup
    impact: Requires Docker Desktop for local development

  - what: Use NextAuth v5 beta
    why: Official Next.js auth, supports App Router, Drizzle adapter
    impact: Authentication schema follows NextAuth conventions

  - what: Store job requirements and nice-to-haves as text fields
    why: Flexible schema for MVP, can migrate to JSONB later
    impact: Parsing required in application layer

  - what: Silent status history logging
    why: Track application lifecycle without cluttering UI
    impact: All status changes automatically logged for analytics

metrics:
  duration: ~12 minutes
  completed: 2026-02-03

schema_design:
  tables: 11
  enums: 4
  indexes: 11
  foreign_keys: 13
---

# Phase 1 Plan 01: Foundation & Core Tracking Summary

**One-liner:** Next.js 15 + PostgreSQL + Drizzle ORM foundation with complete schema for job tracking, applications, interviews, and user management

## What Was Built

Complete application foundation with:
- Next.js 15 application with TypeScript, Tailwind CSS, and App Router
- PostgreSQL 16 database containerized with Docker
- Drizzle ORM with complete schema for all Phase 1 entities
- Database migration system and development tools
- NextAuth v5 integration ready

## Schema Overview

### Core Tables (11 total)

**Authentication (NextAuth v5 standard):**
- `users` - User accounts with profile fields (title, location, resume, bio, social links)
- `accounts` - OAuth provider accounts
- `sessions` - Active user sessions
- `verification_tokens` - Email verification tokens

**Job Tracking:**
- `jobs` - Job listings with title, company, location, requirements, salary
- `applications` - Application records with status enum (saved, applied, interviewing, offered, rejected)
- `status_history` - Silent logging of all status changes
- `interviews` - Interview scheduling with type, outcome, notes

**Supporting Tables:**
- `cover_letters` - User-created cover letters (can be templates or job-specific)
- `user_questionnaire` - Non-blocking onboarding preferences
- `job_feedback` - Job interest tracking for learning (interested/not_interested/maybe)

### Enums
- `application_status` - saved, applied, interviewing, offered, rejected
- `interview_type` - phone_screen, technical, behavioral, system_design, onsite, final, other
- `interview_outcome` - pending, passed, failed, cancelled
- `job_feedback_type` - interested, not_interested, maybe

## Tasks Completed

### Task 1: Initialize Next.js Project
**Commit:** `e3f328e`

- Initialized Next.js 15 with TypeScript and App Router
- Configured Tailwind CSS with PostCSS
- Installed Drizzle ORM and PostgreSQL driver
- Installed NextAuth v5 beta with Drizzle adapter
- Installed UI utilities (clsx, tailwind-merge, lucide-react)
- Installed date-fns for date handling
- Created .env.example with database and auth variables
- Added placeholder homepage: "Orion - Job Hunt Assistant"

**Key files:**
- package.json (11 dependencies, 6 dev dependencies)
- tsconfig.json (with @/* path alias)
- tailwind.config.ts
- src/app/layout.tsx
- src/app/page.tsx

### Task 2: Set up PostgreSQL with Docker and Drizzle
**Commit:** `3704969`

- Created docker-compose.yml with PostgreSQL 16 service
- Configured Drizzle Kit (drizzle.config.ts)
- Created database client (src/db/index.ts)
- Added npm scripts: db:generate, db:migrate, db:push, db:studio

**Key files:**
- docker-compose.yml (PostgreSQL 16 with health checks)
- drizzle.config.ts (schema path, dialect, credentials)
- src/db/index.ts (exports configured db client)

### Task 3: Create Complete Database Schema
**Commit:** `753a652`

- Defined all 11 tables with proper types and constraints
- Added 4 enums for status tracking
- Configured 13 foreign key relationships with cascade deletes
- Added 11 indexes on frequently queried fields
- Defined Drizzle relations for type-safe joins
- Generated initial migration (drizzle/0000_polite_thing.sql)

**Key files:**
- src/db/schema.ts (384 lines, complete schema)
- drizzle/0000_polite_thing.sql (177 lines, generated migration)

## Verification Results

✅ **Next.js 15 with App Router running** - Dev server starts in ~3s
✅ **PostgreSQL schema valid** - Migration generated successfully
✅ **Drizzle ORM configured** - All 11 tables with proper relations
✅ **npm run db:generate succeeds** - Migration file created
⚠️ **Docker requirement** - PostgreSQL container requires Docker Desktop running
✅ **npm run dev starts dev server** - Confirmed working at http://localhost:3000

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] npm package name validation**
- **Found during:** Task 1
- **Issue:** `create-next-app` rejected directory name "Orion" (capital letter)
- **Fix:** Manually created Next.js project files with lowercase "orion" package name
- **Files created:** package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, .eslintrc.json
- **Commit:** Part of e3f328e

**2. [Rule 2 - Missing Critical] Added .env file for local development**
- **Found during:** Verification
- **Issue:** .env.example exists but no .env for actual development
- **Fix:** Created .env with development defaults
- **Files created:** .env (gitignored)
- **Commit:** Not committed (gitignored file)

## Schema Design Decisions

### User Profile Fields
Added comprehensive profile fields to `users` table:
- Professional: title, location, phone
- Social: linkedinUrl, githubUrl, portfolioUrl
- Assets: resume (URL), bio

**Rationale:** Centralize user data for cover letter generation and application autofill

### Status History Logging
Separate `status_history` table for silent tracking:
- Records every status transition
- Includes from/to status and timestamp
- Optional notes field

**Rationale:** Analytics and timeline views without cluttering applications table

### Job Requirements as Text
Stored requirements and niceToHaves as text fields:
- Simple for MVP
- Can migrate to JSONB or separate table later

**Rationale:** Flexibility > premature optimization

### Interview Types Enum
Comprehensive interview type classification:
- phone_screen, technical, behavioral, system_design, onsite, final, other

**Rationale:** Enables interview prep features and analytics in future phases

## Next Phase Readiness

### Ready for Next Plans
✅ **01-02 (NextAuth)** - Database schema ready with users/accounts/sessions tables
✅ **01-03 (Job/App UI)** - Complete schema for jobs and applications
✅ **Future phases** - All data models in place

### Blockers
- None - All dependencies met

### Concerns
- Docker Desktop required for local development (document in README)
- Google OAuth credentials needed for NextAuth (can use email auth as fallback)

## Files Modified

**Created (13 files):**
- Core config: package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, .eslintrc.json
- Database: docker-compose.yml, drizzle.config.ts, src/db/schema.ts, src/db/index.ts
- App: src/app/layout.tsx, src/app/page.tsx, src/app/globals.css
- Env: .env.example

**Modified:**
- None (fresh project)

## Git History

```
753a652 feat(01-01): create complete database schema with Drizzle ORM
3704969 feat(01-01): set up PostgreSQL with Docker and Drizzle ORM
e3f328e feat(01-01): initialize Next.js project with core dependencies
```

## Validation Commands

```bash
# Start database
docker compose up -d

# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Start dev server
npm run dev
```

## Success Metrics

- **Tables created:** 11/11 ✅
- **Migrations generated:** 1 ✅
- **Build errors:** 0 ✅
- **Dev server startup time:** ~3 seconds ✅
- **Schema validation:** Passed ✅

---

**Status:** ✅ Complete
**Duration:** ~12 minutes
**Commits:** 3
**Files created:** 13
