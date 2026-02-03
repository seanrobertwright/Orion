# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Enable intelligent, organized, and efficient job hunting by automating job discovery and application management while learning what resonates with you — so you can focus on landing the right opportunity quickly.
**Current focus:** Phase 1 - Foundation & Core Tracking

## Current Position

Phase: 1 of 6 (Foundation & Core Tracking)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-03 — Completed 01-02-PLAN.md (Authentication & Profile)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~22 minutes
- Total execution time: 0.75 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2 | 45 min | 22 min |

**Recent Trend:**
- Last 5 plans: 01-01 (12m), 01-02 (33m)
- Trend: Ramping up (auth more complex than setup)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Research phase: Next.js App Router over Pages Router (future-proof, Server Components)
- Research phase: Drizzle ORM over Prisma (14x performance, 7KB vs 300KB bundle)
- Research phase: Grammy over Telegraf for Telegram bot (better Next.js compatibility)
- Research phase: Claude API with prompt caching (90% cost reduction on repeated matching)
- Research phase: Adzuna API for job boards (legitimate, free tier available, avoid scraping legal risks)
- 01-01: Next.js 15 with src directory and App Router (modern patterns, file-based routing)
- 01-01: PostgreSQL 16 with Docker (production-grade, easy local setup)
- 01-01: NextAuth v5 beta (official Next.js auth, supports App Router)
- 01-01: Job requirements as text fields (flexible for MVP, can migrate to JSONB later)
- 01-01: Silent status history logging (analytics without cluttering UI)
- 01-02: DrizzleAdapter simple config over custom table mapping (NextAuth v5 compatibility)
- 01-02: Core profile fields (salary, work preference) in users table vs. userQuestionnaire (query efficiency)
- 01-02: Route groups (auth)/(protected) for auth-based organization (Next.js 15 App Router convention)
- 01-02: Middleware-based route protection over per-page checks (centralized auth logic)

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 (Current):**
- Docker Desktop required for local PostgreSQL development (document in README)
- Google OAuth credentials needed for NextAuth (email auth available as fallback)

**Phase 2 (Telegram Bot):**
- Grammy webhook setup with Next.js API routes needs validation during planning
- ngrok required for local development (webhook HTTPS requirement)

**Phase 4 (AI Resume):**
- Claude resume parsing accuracy on diverse formats needs empirical testing
- Cost optimization via prompt caching must be implemented from start

**Phase 5 (Job Boards):**
- ZipRecruiter publisher program approval may be required (fallback: Adzuna only)

## Session Continuity

Last session: 2026-02-03 (plan execution)
Stopped at: Completed 01-02-PLAN.md (Authentication & Profile)
Resume file: None

---
*State initialized: 2026-02-02*
*Last updated: 2026-02-03*
