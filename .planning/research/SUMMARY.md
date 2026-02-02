# Project Research Summary

**Project:** Orion - Job Search Application with Telegram Bot
**Domain:** Job Hunt Application with AI-Powered Resume Analysis
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Orion is a modern job hunt application combining Next.js 15 with PostgreSQL for core functionality, Telegram bot integration for remote access, and Claude API for intelligent resume processing and job matching. Expert consensus strongly recommends Next.js App Router with Drizzle ORM for optimal performance, Telegram webhooks via Grammy framework for real-time bot functionality, and Claude's native PDF processing for resume analysis without additional parsing infrastructure.

The recommended approach prioritizes legitimate job board APIs (Adzuna, ZipRecruiter) over scraping to avoid legal risks, implements a three-tier service architecture (API routes, business logic, database layer) for maintainability, and uses Claude's structured outputs with prompt caching to achieve 90% cost reduction for repetitive job matching operations. Initial MVP should focus on manual job tracking and Telegram notification delivery before adding job board integrations or advanced AI features.

Key risks center on job board API restrictions (Indeed/LinkedIn deprecated, requiring alternatives), Claude API costs scaling with usage (mitigated through prompt caching and Batch API), and the complexity of maintaining a custom Next.js server if WebSocket functionality is required for real-time updates. Starting with a simpler polling-based approach and legitimate APIs minimizes technical debt while validating core functionality.

## Key Findings

### Recommended Stack

Next.js 15 with App Router is the clear choice for 2026, offering Server Components for performance, built-in API routes, and future-proof architecture. PostgreSQL 17 provides advanced features like full-text search (tsvector), JSONB for flexible document storage, and native LISTEN/NOTIFY for real-time capabilities. Drizzle ORM outperforms Prisma in benchmarks (14x lower latency, ~7KB bundle vs 300KB+) while maintaining excellent TypeScript support and SQL transparency.

**Core technologies:**
- **Next.js 15 (App Router):** Full-stack framework — Best-in-class React framework with Server Components, SEO optimization, and native API routes. App Router is production-ready and recommended over Pages Router.
- **PostgreSQL 17:** Primary database — Enterprise-grade with full-text search, JSONB, advanced indexing (GIN, BRIN), and 60-70% better incremental VACUUM performance vs PostgreSQL 16.
- **Drizzle ORM:** Data access layer — Fastest TypeScript ORM with 7KB bundle size, SQL-like syntax, perfect for serverless/edge deployments, and native PostgreSQL feature support.
- **Grammy (Telegram Bot):** Bot framework — Modern TypeScript-first library with minimal dependencies, native Next.js App Router compatibility, and superior serverless cold start performance vs Telegraf.
- **Claude API (Sonnet 4.5):** Resume processing — Native PDF support via vision capabilities, structured JSON outputs with schema guarantees, and 90% cost reduction via prompt caching for job matching.
- **NextAuth.js v5:** Authentication — Deep Next.js integration, database sessions for security, Google OAuth support out-of-box.
- **Docker + PostgreSQL:** Local development — Consistent dev environment with docker-compose for PostgreSQL, pgAdmin, Redis, and Next.js app.

### Expected Features

Research reveals modern job hunt applications must balance core tracking functionality with intelligent automation while avoiding feature bloat that delays launch.

**Must have (table stakes):**
- Manual job entry and tracking (title, company, URL, status)
- Application status management (applied, interview, offer, rejected)
- Interview scheduling with reminders
- Document management (multiple resume versions, cover letters)
- Telegram bot for remote access and notifications
- Google OAuth authentication
- Basic job search and filtering

**Should have (competitive):**
- AI-powered resume parsing (Claude API structured extraction)
- Job-resume matching with scored recommendations
- Resume tailoring suggestions for specific jobs
- Legitimate job board integrations (Adzuna, ZipRecruiter APIs)
- Application timeline and notes
- Contact/networking tracking
- Dashboard with application statistics
- Email notifications for key events

**Defer (v2+):**
- Direct scraping of Indeed/LinkedIn/Glassdoor (high legal risk, maintenance burden)
- Advanced analytics and reporting
- Team/collaboration features
- Browser extension for one-click applications
- Integration with LinkedIn/Indeed accounts (requires expensive partnerships)
- Mobile app (Telegram bot serves as mobile interface for MVP)

### Architecture Approach

The application follows a layered architecture with clear separation between presentation (Next.js App Router), API layer (route handlers), service layer (business logic), and data layer (Drizzle + PostgreSQL). Feature-based organization for API routes (`/api/jobs/*`, `/api/applications/*`, `/api/documents/*`) promotes scalability over flat structure.

**Major components:**
1. **Next.js Application Layer** — React Server Components for pages, Client Components for interactive UI, Server Actions for mutations, middleware for auth checks. Uses App Router with route groups for organization.
2. **Service Layer** — Business logic isolated in `/lib/services/` (jobService, applicationService, documentService, telegramService) with validation via Zod schemas, keeping API routes thin.
3. **Telegram Bot Integration** — Grammy framework with webhook architecture via ngrok (local dev) or production URLs. Bot handles commands (`/search`, `/status`), sends notifications, and supports conversation flows.
4. **Resume Processing Pipeline** — Claude Files API for PDF upload (reusable file IDs), structured output extraction with Pydantic/Zod schemas (guaranteed JSON validity), and prompt caching for 90% cost reduction on repeated job matching.
5. **Database Layer** — Drizzle ORM with normalized schema (users, jobs, applications, interviews, documents, contacts), strategic indexes (B-tree, GIN for full-text search, BRIN for time-series), and JSONB for flexible data (resume parsed data, tailoring suggestions).

### Critical Pitfalls

Research reveals these are the highest-impact risks that could derail the project:

1. **Scraping Major Job Boards (Indeed/LinkedIn/Glassdoor)** — All three explicitly prohibit scraping in ToS and have taken legal action. Indeed API is deprecated for job search, LinkedIn requires $10K+ partnership, Glassdoor has no public API. **Avoid:** Use legitimate APIs (Adzuna free tier, ZipRecruiter publisher program) or third-party aggregators with legal compliance guarantees.

2. **Ignoring Claude API Cost Scaling** — Without optimization, processing 100 resumes against 50 jobs = 5,000 API calls at ~$0.02 each = $100. With poor prompt design, costs can spiral. **Avoid:** Implement prompt caching (90% discount on repeated content), use Batch API for bulk operations (50% discount), select appropriate model tier (Haiku for simple extraction, Sonnet for matching).

3. **Choosing Pages Router Over App Router** — Pages Router is in maintenance mode while App Router is the future of Next.js with Server Components, streaming, and superior performance. **Avoid:** Start with App Router from day one. Learning curve is justified by long-term benefits and ecosystem momentum.

4. **Not Planning for Telegram Webhook Requirements** — Telegram webhooks require HTTPS URLs, which means ngrok for local dev and proper SSL in production. Polling is simpler but wastes API quota and has delays. **Avoid:** Use ngrok for development, set up proper domain with SSL for production, implement webhook secret validation.

5. **Underestimating PostgreSQL Index Strategy** — Large job datasets (1000+ jobs per user) with full-text search will cause slow queries without proper indexing. **Avoid:** Create GIN indexes for tsvector search and tag arrays, BRIN indexes for time-series data (created_at), and composite indexes for common query patterns (user_id + status).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Core Tracking
**Rationale:** Establish infrastructure and basic functionality before adding complex integrations. Validates core value proposition (organized job tracking) without external dependencies.

**Delivers:**
- Next.js 15 project with App Router structure
- PostgreSQL database with Drizzle ORM schema (users, jobs, applications, interviews, documents)
- NextAuth.js Google OAuth authentication
- Basic CRUD for jobs and applications
- Simple dashboard showing application statistics
- Docker Compose for local development environment

**Addresses:** Must-have features (manual job entry, status tracking, authentication)

**Avoids:** Pitfall #3 (choosing wrong Next.js router) by using App Router from start

**Research Flag:** Standard patterns — well-documented Next.js + PostgreSQL setup, skip deep research

### Phase 2: Telegram Bot Integration
**Rationale:** Telegram bot provides mobile access and notification channel before job board integrations. Simpler than building native mobile app while delivering remote access value.

**Delivers:**
- Grammy bot framework with webhook architecture
- Command handlers (`/start`, `/search`, `/status`, `/add`)
- Notification system for application status changes
- ngrok setup for local development
- Webhook security (secret token validation)

**Uses:** Grammy (stack), Telegram Bot API

**Implements:** Telegram Bot Integration component from architecture

**Avoids:** Pitfall #4 (webhook requirements) with proper ngrok setup and SSL planning

**Research Flag:** Some complexity — Grammy + Next.js integration patterns, webhook security. May need phase-specific research.

### Phase 3: Document Management
**Rationale:** Resume storage and version management needed before AI processing. Establishes document handling patterns.

**Delivers:**
- File upload API route with validation
- Multiple resume version support per user
- Document metadata storage (type, name, version, is_default)
- File storage strategy (local for MVP, S3 migration path)
- Document listing and deletion endpoints

**Addresses:** Must-have (document management), prepares for Should-have (resume parsing)

**Research Flag:** Standard patterns — file upload in Next.js is well-documented

### Phase 4: AI Resume Processing
**Rationale:** Claude API integration after document foundation is established. This unlocks competitive features (resume parsing, job matching).

**Delivers:**
- Claude Files API integration for PDF upload
- Structured resume data extraction (Pydantic schemas)
- Skills extraction and storage (normalized skills table)
- Work experience and education parsing
- Processing log for cost tracking

**Uses:** Claude API (Sonnet 4.5), Structured Outputs

**Addresses:** Should-have (AI resume parsing)

**Avoids:** Pitfall #2 (cost scaling) by implementing prompt caching from start and logging all token usage

**Research Flag:** Needs validation — Test Claude's accuracy on diverse resume formats during implementation. Monitor costs closely.

### Phase 5: Job Board APIs
**Rationale:** Add legitimate job sources after core tracking and AI features work. Deferred to avoid blocking on external API approvals.

**Delivers:**
- Adzuna API integration (free tier)
- Job search with location and keyword filters
- Job data normalization (external format → internal schema)
- Deduplication logic for imported jobs
- Optional: ZipRecruiter publisher program integration

**Addresses:** Should-have (job board integration)

**Avoids:** Pitfall #1 (scraping major boards) by using legitimate APIs with free tiers

**Research Flag:** Some complexity — API rate limits, data mapping, error handling. Phase research may be helpful.

### Phase 6: Intelligent Matching & Tailoring
**Rationale:** Combines job board data with AI processing for high-value features. Depends on Phase 4 (AI) and Phase 5 (job boards) completion.

**Delivers:**
- Job-resume matching with Claude (scored 0-100)
- Match results storage (matching/missing skills, recommendations)
- Resume tailoring suggestions for specific jobs
- Batch processing for matching multiple candidates against jobs
- Dashboard showing top matches

**Uses:** Claude API with prompt caching (90% cost reduction)

**Addresses:** Should-have (job matching, resume tailoring)

**Avoids:** Pitfall #2 (API costs) through Batch API (50% discount) and caching strategy

**Research Flag:** Medium complexity — Prompt engineering for match quality, cost optimization patterns

### Phase Ordering Rationale

- **Foundation first:** Establishing database schema, auth, and basic CRUD prevents rework when adding complex features
- **Telegram before job boards:** Delivers mobile access value early without external dependencies or approval processes
- **Documents before AI:** File handling infrastructure must exist before processing documents with Claude
- **AI before job boards:** Can still provide value (parsing user-uploaded resumes) even if job board integrations are delayed
- **Matching last:** Requires both AI processing (Phase 4) and job data (Phase 5) to be operational

This ordering minimizes dependencies between phases, enables incremental value delivery, and defers high-risk integrations (job boards, AI cost scaling) until core functionality proves valuable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Telegram Bot):** Grammy webhook setup with Next.js API routes, conversation state management, handling rate limits (20 messages/min to groups, 1 msg/sec to individuals)
- **Phase 4 (AI Resume):** Claude prompt engineering for resume extraction accuracy, testing on diverse resume formats (tables, multi-column layouts, creative designs), cost optimization strategies
- **Phase 5 (Job Boards):** Adzuna and ZipRecruiter API specifics (rate limits, pagination, data structure), error handling for API downtime, job deduplication logic
- **Phase 6 (Matching):** Prompt caching implementation patterns, Batch API integration for nightly matching runs, structured output schema design for match results

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js App Router, PostgreSQL with Drizzle, NextAuth.js Google OAuth — all have extensive official documentation and established patterns
- **Phase 3 (Documents):** File upload in Next.js with validation is well-documented, local file storage is straightforward

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies recommended have official docs, proven production use, and clear 2026 guidance (Next.js 15 stable, PostgreSQL 17 released, Drizzle gaining momentum) |
| Features | HIGH | Job hunt application domain is well-understood with clear table stakes (job tracking, applications, interviews). Feature prioritization aligns with MVP principles |
| Architecture | HIGH | Layered architecture with service layer separation is proven pattern. Next.js App Router + Drizzle + PostgreSQL is established stack with production deployments |
| Pitfalls | HIGH | Legal risks around job board scraping are well-documented (LinkedIn v. hiQ Labs precedent, active ToS enforcement). Claude cost optimization patterns are official Anthropic guidance |

**Overall confidence:** HIGH

Research drew from official documentation (Anthropic Claude API, Next.js, PostgreSQL), current 2026 comparisons (Drizzle vs Prisma benchmarks, Grammy vs Telegraf), and legal precedent (job board scraping cases). All core technologies are production-ready with active communities.

### Gaps to Address

Areas where research was inconclusive or needs validation during implementation:

- **Claude Resume Parsing Accuracy:** While Claude 3.5+ Sonnet has native PDF support, actual accuracy on diverse resume formats (creative layouts, multi-column, tables) needs empirical testing. **Handle:** Start Phase 4 with test suite of 20+ varied resume formats, measure extraction accuracy, iterate on prompts. Budget for Opus 4.5 ($5/$25 per 1M tokens) if Sonnet struggles with complex layouts.

- **ZipRecruiter Publisher Program Approval:** Free tier availability for ZipRecruiter API is unclear; may require publisher agreement with revenue sharing terms. **Handle:** Apply for publisher program in Phase 1, have backup plan to launch with Adzuna only. Consider Google Jobs via SerpApi (free tier) as third option.

- **Real-Time Updates Necessity:** Research shows polling every 30-60 seconds is sufficient for job applications (not time-critical like chat), but user expectations may differ. **Handle:** Start with polling (simpler, works on any deployment), add WebSockets + PostgreSQL LISTEN/NOTIFY only if user testing reveals strong need. This keeps Vercel serverless deployment option open.

- **Telegram Rate Limits in Practice:** Documentation specifies 1 msg/sec to individuals, 20 msgs/min to groups, but real-world enforcement (bursts, errors) unclear. **Handle:** Implement conservative rate limiting from start (grammy-ratelimiter plugin), log all 429 errors during Phase 2 testing, adjust limits based on observed behavior.

- **Document Storage Strategy:** MVP uses local file storage, but migration path to S3/cloud storage impacts schema design (file_path vs URL). **Handle:** Design schema with flexible file_path column (can store local path or S3 URL), add abstraction layer in documentService so switching storage backend doesn't require API route changes.

## Sources

Research synthesized from four detailed documents:

### JOB_BOARD_APIS.md
**Confidence:** HIGH — Based on official API documentation, legal precedent (LinkedIn v. hiQ Labs), and 2026 current status
**Key findings:** Indeed API deprecated for job search, LinkedIn requires $10K+ partnership, Glassdoor has no public API. Recommended legitimate alternatives: Adzuna (free tier), ZipRecruiter (publisher program), avoid scraping due to ToS violations and legal risk.

### TELEGRAM_INTEGRATION.md
**Confidence:** HIGH — Based on official Telegram Bot API docs, Grammy framework docs, Next.js integration patterns
**Key findings:** Grammy preferred over Telegraf (better Next.js compatibility, fewer dependencies, modern TypeScript). Webhooks recommended over polling (required for production, more efficient). Rate limits: 1 msg/sec to individuals, 20 msgs/min to groups.

### SYSTEM_ARCHITECTURE.md
**Confidence:** HIGH — Based on official Next.js 15 docs, PostgreSQL 17 docs, ORM benchmarks, production deployment guides
**Key findings:** App Router is production-ready and recommended over Pages Router. Drizzle ORM outperforms Prisma (14x lower latency, 7KB vs 300KB bundle). PostgreSQL 17 offers 60-70% better incremental VACUUM performance. Feature-based API route organization scales better than flat structure.

### DOCUMENT_PROCESSING.md
**Confidence:** HIGH — Based on official Anthropic Claude API docs, pricing guides, structured outputs documentation
**Key findings:** Claude 3.5+ Sonnet has native PDF support (beta: pdfs-2024-09-25) via vision capabilities. Structured outputs (GA) guarantee JSON schema compliance. Prompt caching achieves 90% cost reduction on repeated content. Batch API offers 50% discount for async processing. Cost per resume: $0.01-0.03 with Sonnet 4.5.

### Additional Context
All research documents include extensive source citations with URLs to official documentation, comparison articles, and technical guides dated 2026 or late 2025, ensuring recommendations reflect current best practices and available tooling.

---
*Research completed: 2026-02-02*
*Ready for roadmap: Yes*
