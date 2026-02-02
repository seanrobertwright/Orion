# System Architecture - Next.js Job Hunt Application with PostgreSQL

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Target Stack:** Next.js 15 + PostgreSQL + Docker

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Next.js Router Decision](#nextjs-router-decision)
3. [API Route Organization](#api-route-organization)
4. [PostgreSQL Schema Design](#postgresql-schema-design)
5. [ORM Recommendation](#orm-recommendation)
6. [Authentication Flow](#authentication-flow)
7. [Real-Time Updates Strategy](#real-time-updates-strategy)
8. [Local Development Setup](#local-development-setup)
9. [Docker Containerization](#docker-containerization)
10. [Performance Optimization](#performance-optimization)
11. [Technology Stack Summary](#technology-stack-summary)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Next.js App  │  │  Telegram    │  │   External   │         │
│  │   (React)    │  │  Bot Client  │  │   OAuth      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 15 App Router                      │   │
│  │  ┌───────────┐  ┌────────────┐  ┌─────────────────┐   │   │
│  │  │   Pages   │  │ Components │  │  Server Actions │   │   │
│  │  │  (RSC)    │  │  (Client)  │  │   (API Logic)   │   │   │
│  │  └─────┬─────┘  └─────┬──────┘  └────────┬────────┘   │   │
│  └────────┼──────────────┼───────────────────┼────────────┘   │
│           │              │                   │                 │
│  ┌────────┴──────────────┴───────────────────┴────────────┐   │
│  │                   API Routes Layer                      │   │
│  │  /api/jobs/*  /api/applications/*  /api/auth/*         │   │
│  │  /api/documents/*  /api/telegram/*  /api/interviews/*  │   │
│  └────────┬──────────────┬───────────────────┬────────────┘   │
└───────────┼──────────────┼───────────────────┼────────────────┘
            │              │                   │
            ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐        │
│  │ Job Service  │  │  Auth Service │  │ File Service │        │
│  └──────┬───────┘  └───────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│  ┌──────┴──────────────────┴──────────────────┴───────┐        │
│  │              ORM Layer (Drizzle)                   │        │
│  └──────────────────────┬─────────────────────────────┘        │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  PostgreSQL 17                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │  │
│  │  │   Tables   │  │  Indexes   │  │  Materialized     │  │  │
│  │  │            │  │  (B-tree,  │  │  Views (Cache)    │  │  │
│  │  │            │  │   GIN)     │  │                   │  │  │
│  │  └────────────┘  └────────────┘  └───────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Optional: Redis (Rate Limiting/Caching)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐       │
│  │   Google   │  │   Telegram   │  │   File Storage    │       │
│  │   OAuth    │  │   Bot API    │  │   (S3/Local)      │       │
│  └────────────┘  └──────────────┘  └───────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next.js Router Decision

### Recommendation: App Router (Next.js 15)

**Rationale:**

For new projects in 2026, **always use the App Router** as it is the future-proof standard and Next.js recommends migrating to leverage React's latest features.

#### Key Advantages of App Router:

1. **Performance & SEO**
   - Server Components reduce JavaScript sent to browser (faster load times, better Core Web Vitals)
   - Advanced metadata handling with competitive SEO advantage
   - Improved Core Web Vitals scores (crucial ranking factor in 2026)

2. **Developer Experience**
   - `layout.js` makes creating/managing layouts straightforward
   - Nested layouts handle complex page structures easily
   - "Soft navigation" - only reloads changed parts, preserving user state
   - Server Actions for form submissions and data mutations

3. **Modern React Features**
   - React Server Components (RSC) support
   - Streaming and Suspense boundaries
   - Better data fetching patterns with async/await in components

4. **Future-Proof**
   - Active development and improvements from Vercel
   - Pages Router is in maintenance mode
   - Growing ecosystem and community adoption

#### Trade-offs to Consider:

- **Steeper learning curve** - requires understanding RSC, server vs client components
- **Migration complexity** - if converting from Pages Router
- **File structure changes** - new conventions (route.ts, layout.tsx, page.tsx)

**Project Structure:**
```
app/
├── (auth)/                    # Route group for auth-related pages
│   ├── login/
│   │   └── page.tsx
│   └── callback/
│       └── page.tsx
├── (dashboard)/               # Route group for authenticated pages
│   ├── layout.tsx            # Shared dashboard layout
│   ├── jobs/
│   │   ├── page.tsx          # /jobs listing
│   │   ├── [id]/
│   │   │   └── page.tsx      # /jobs/[id] detail
│   │   └── new/
│   │       └── page.tsx      # /jobs/new create
│   ├── applications/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── interviews/
│   │   └── page.tsx
│   └── documents/
│       └── page.tsx
├── api/                       # API routes (Next.js API layer)
│   ├── jobs/
│   ├── applications/
│   ├── auth/
│   ├── telegram/
│   └── documents/
├── layout.tsx                 # Root layout
├── page.tsx                   # Home page
└── error.tsx                  # Error boundary
```

**Sources:**
- [Next.js App Router vs Pages Router Comparison - Pagepro](https://pagepro.co/blog/app-router-vs-page-router-comparison/)
- [Next.js 15 App Router vs Pages Router 2025 - Medium](https://medium.com/@sehouli.hamza/the-nextjs-15-app-router-vs-pages-router-explained-heres-what-you-need-to-know-for-2025-f66e5eb834ff)
- [How to Choose Between App Router and Pages Router in Next.js 15 - Wisp CMS](https://www.wisp.blog/blog/how-to-choose-between-app-router-and-pages-router-in-nextjs-15-a-complete-guide-for-seo-conscious-developers)

---

## API Route Organization

### Recommended Structure: Feature/Module-Based Organization

Organize API routes by features/modules rather than a flat structure. This keeps the codebase scalable and maintainable.

```
app/api/
├── jobs/
│   ├── route.ts                    # GET /api/jobs (list), POST /api/jobs (create)
│   ├── [id]/
│   │   ├── route.ts                # GET/PUT/DELETE /api/jobs/[id]
│   │   └── applications/
│   │       └── route.ts            # GET /api/jobs/[id]/applications
│   ├── search/
│   │   └── route.ts                # POST /api/jobs/search (advanced search)
│   └── bulk/
│       └── route.ts                # POST /api/jobs/bulk (bulk operations)
│
├── applications/
│   ├── route.ts                    # GET /api/applications (user's applications)
│   ├── [id]/
│   │   ├── route.ts                # GET/PUT/DELETE /api/applications/[id]
│   │   ├── status/
│   │   │   └── route.ts            # PUT /api/applications/[id]/status
│   │   └── notes/
│   │       └── route.ts            # GET/POST /api/applications/[id]/notes
│   └── stats/
│       └── route.ts                # GET /api/applications/stats
│
├── interviews/
│   ├── route.ts                    # GET /api/interviews (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts                # GET/PUT/DELETE /api/interviews/[id]
│   │   └── reschedule/
│   │       └── route.ts            # POST /api/interviews/[id]/reschedule
│   └── upcoming/
│       └── route.ts                # GET /api/interviews/upcoming
│
├── documents/
│   ├── route.ts                    # GET /api/documents (list), POST (upload)
│   ├── [id]/
│   │   ├── route.ts                # GET/DELETE /api/documents/[id]
│   │   └── download/
│   │       └── route.ts            # GET /api/documents/[id]/download
│   ├── resumes/
│   │   └── route.ts                # GET /api/documents/resumes
│   └── parse/
│       └── route.ts                # POST /api/documents/parse (resume parsing)
│
├── telegram/
│   ├── webhook/
│   │   └── route.ts                # POST /api/telegram/webhook
│   └── notify/
│       └── route.ts                # POST /api/telegram/notify (internal)
│
└── auth/
    ├── [...nextauth]/
    │   └── route.ts                # NextAuth handler
    ├── callback/
    │   └── route.ts                # OAuth callback
    └── session/
        └── route.ts                # GET /api/auth/session
```

### Best Practices:

1. **Separation of Concerns**
   - Keep API routes thin - delegate business logic to service layer
   - Business logic goes in `/lib/services/`
   - Database queries handled by ORM in `/lib/db/`

2. **Service Layer Organization**
```
lib/
├── services/
│   ├── jobService.ts           # Job-related business logic
│   ├── applicationService.ts   # Application logic
│   ├── documentService.ts      # File/document handling
│   ├── telegramService.ts      # Telegram bot logic
│   └── authService.ts          # Authentication logic
├── db/
│   ├── schema/                 # Drizzle schema definitions
│   ├── migrations/             # Database migrations
│   └── index.ts                # Database connection
├── utils/
│   ├── validation.ts           # Zod schemas for validation
│   ├── formatting.ts           # Data formatting utilities
│   └── errors.ts               # Custom error classes
└── config/
    ├── database.ts
    ├── auth.ts
    └── telegram.ts
```

3. **API Route Template**
```typescript
// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { jobService } from '@/lib/services/jobService';
import { jobSchema } from '@/lib/utils/validation';
import { authOptions } from '@/lib/config/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const jobs = await jobService.getJobs(session.user.id, { page, limit });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = jobSchema.parse(body);

    const job = await jobService.createJob(session.user.id, validated);

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

4. **Security & Performance**
   - Use middleware for authentication/authorization checks
   - Implement rate limiting (consider Redis or Upstash)
   - Validate inputs with Zod schemas
   - Use server-side caching where appropriate
   - Enable compression for large responses

5. **Route Groups for Organization**
   - Use parentheses for organizational folders: `(internal)/`, `(public)/`
   - Route groups don't affect URL structure

**Sources:**
- [Next.js Folder Structure Best Practices 2026 - CodeByDeep](https://www.codebydeep.com/blog/next-js-folder-structure-best-practices-for-scalable-applications-2026-guide)
- [Best Practices for Organizing Your Next.js 15 - DEV Community](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)
- [The Ultimate Guide to Organizing Your Next.js 15 Project Structure - Wisp CMS](https://www.wisp.blog/blog/the-ultimate-guide-to-organizing-your-nextjs-15-project-structure)

---

## PostgreSQL Schema Design

### Database Schema for Job Hunt Application

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  telegram_chat_id BIGINT UNIQUE,
  telegram_username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Job listings table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  location_type VARCHAR(50), -- 'remote', 'hybrid', 'onsite'
  job_type VARCHAR(50), -- 'full-time', 'part-time', 'contract', 'internship'
  url TEXT,
  description TEXT,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(3) DEFAULT 'USD',
  source VARCHAR(100), -- 'manual', 'linkedin', 'indeed', 'telegram'
  external_id VARCHAR(255), -- ID from external source
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'archived'
  tags TEXT[], -- Array of tags for categorization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_date DATE,
  deadline_date DATE,

  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resume_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  cover_letter_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,
  priority INTEGER DEFAULT 5, -- 1-10 scale
  salary_expectation INTEGER,
  referral VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, job_id) -- Prevent duplicate applications
);

-- Application status history (for tracking changes)
CREATE TABLE application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Interviews table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'phone', 'video', 'onsite', 'technical', 'behavioral', 'final'
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  location VARCHAR(500), -- Physical address or video call link
  interviewer_name VARCHAR(255),
  interviewer_email VARCHAR(255),
  notes TEXT,
  preparation_notes TEXT,
  outcome VARCHAR(50), -- 'pending', 'passed', 'failed', 'rescheduled'
  feedback TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (resumes, cover letters, portfolios)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'resume', 'cover_letter', 'portfolio', 'certificate', 'other'
  name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- S3 path or local storage path
  file_size INTEGER,
  mime_type VARCHAR(100),
  version INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT FALSE,
  parsed_data JSONB, -- Structured data from resume parsing
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application notes/timeline
CREATE TABLE application_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general', -- 'general', 'followup', 'reminder', 'contact'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts/Networking
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  position VARCHAR(255),
  linkedin_url TEXT,
  notes TEXT,
  relationship VARCHAR(100), -- 'recruiter', 'hiring_manager', 'employee', 'referral', 'other'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link contacts to applications
CREATE TABLE application_contacts (
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, contact_id)
);

-- User preferences/settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}', -- Job preferences, notification settings, etc.
  notification_email BOOLEAN DEFAULT TRUE,
  notification_telegram BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for NextAuth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification tokens (for NextAuth)
CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Accounts table (for NextAuth OAuth)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX idx_jobs_search_vector ON jobs USING GIN(search_vector); -- Full-text search
CREATE INDEX idx_jobs_tags ON jobs USING GIN(tags); -- Array search
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location_type ON jobs(location_type);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_date ON applications(applied_date DESC);
CREATE INDEX idx_applications_priority ON applications(priority DESC);

CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX idx_interviews_outcome ON interviews(outcome);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_is_default ON documents(is_default) WHERE is_default = TRUE;

CREATE INDEX idx_application_notes_application_id ON application_notes(application_id);
CREATE INDEX idx_application_status_history_application_id ON application_status_history(application_id);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_company ON contacts(company);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update application status history
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO application_status_history (application_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_application_status_change_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- View for application analytics
CREATE VIEW application_stats AS
SELECT
  user_id,
  COUNT(*) as total_applications,
  COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_count,
  COUNT(CASE WHEN status = 'interview' THEN 1 END) as interview_count,
  COUNT(CASE WHEN status = 'offer' THEN 1 END) as offer_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
  AVG(CASE WHEN status IN ('offer', 'accepted') THEN
    EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400
  END) as avg_days_to_offer
FROM applications
GROUP BY user_id;
```

### Schema Design Rationale:

1. **Normalization**: Proper 3NF normalization while balancing query performance
2. **UUID Primary Keys**: Better for distributed systems and security
3. **Timestamps**: Track creation and updates for audit trails
4. **Full-Text Search**: PostgreSQL's native tsvector for job search
5. **Array/JSONB**: Flexible storage for tags, preferences, parsed resume data
6. **Soft Deletes**: Could be added with `deleted_at` columns if needed
7. **Status History**: Automatic tracking of application status changes
8. **Indexes**: Strategic indexes for common query patterns

**Sources:**
- [How to Design a Relational Database for Online Job Portal - GeeksforGeeks](https://geeksforgeeks.org/how-to-design-a-relational-database-for-online-job-portal)
- [SQL and Database Fundamentals in 2026 - Nucamp](https://www.nucamp.co/blog/sql-and-database-fundamentals-in-2026-queries-design-and-postgresql-essentials)

---

## ORM Recommendation

### Recommendation: Drizzle ORM

**Rationale:**

For a 2026 job hunt application with performance requirements and PostgreSQL, **Drizzle ORM** is the optimal choice.

### Comparison Matrix:

| Feature | Drizzle | Prisma | TypeORM |
|---------|---------|--------|---------|
| **Performance** | ⭐⭐⭐⭐⭐ Fastest | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Moderate |
| **Type Safety** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good |
| **Bundle Size** | ~7KB | ~300KB+ | Heavy |
| **SQL Control** | Direct SQL-like | Abstracted | Abstracted |
| **Edge Runtime** | ✅ Yes | ❌ No | ❌ No |
| **Learning Curve** | Medium | Easy | Steep |
| **Migration Tools** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Community** | Growing | Large | Large |

### Why Drizzle for This Project:

1. **Performance Leader**
   - Up to 14x lower latency for complex queries
   - ~7KB bundle size (minimal cold start impact)
   - Zero binary dependencies (unlike Prisma's Rust engine)
   - Ideal for handling large job datasets efficiently

2. **SQL Transparency**
   - Compiles to clean, optimized SQL
   - Easy to debug and optimize queries
   - Direct control over query generation
   - Familiar SQL-like syntax

3. **Next.js 15 & Edge Compatibility**
   - Perfect for App Router and Server Components
   - Works with Vercel Edge Runtime
   - Serverless-optimized

4. **Type Safety**
   - Inferred TypeScript types from schema
   - Full IDE autocomplete support
   - Catch errors at compile time

5. **PostgreSQL-First Design**
   - Excellent PostgreSQL support
   - Native support for advanced features (arrays, JSONB, full-text search)
   - Efficient handling of PostgreSQL-specific types

### Drizzle Setup Example:

```typescript
// lib/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  telegramChatId: varchar('telegram_chat_id', { length: 50 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLogin: timestamp('last_login'),
});

// lib/db/schema/jobs.ts
import { pgTable, uuid, varchar, text, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { users } from './users';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }),
  locationType: varchar('location_type', { length: 50 }),
  jobType: varchar('job_type', { length: 50 }),
  url: text('url'),
  description: text('description'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  status: varchar('status', { length: 50 }).default('open'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  postedDate: date('posted_date'),
});

// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Usage example in service
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema/jobs';
import { eq, and, desc } from 'drizzle-orm';

export async function getJobsByUser(userId: string) {
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt));
}
```

### When to Consider Alternatives:

**Choose Prisma if:**
- Team values DX over performance
- Need the most mature ecosystem
- Want visual schema management (Prisma Studio)
- Building prototypes/MVPs quickly

**Choose TypeORM if:**
- Using NestJS (tight integration)
- Team is familiar with Active Record pattern
- Building massive enterprise monoliths

### Migration Strategy:

If starting fresh, use Drizzle. If migrating from Prisma, Drizzle provides migration tools.

**Sources:**
- [Drizzle vs Prisma: Choosing the Right TypeScript ORM - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)
- [Best Node.js ORMs: Prisma vs Drizzle vs TypeORM - Nihar Daily](https://www.nihardaily.com/173-the-best-nodejs-orms-in-2025-a-brutally-honest-review)
- [Prisma vs Drizzle ORM in 2026 - Medium](https://medium.com/@thebelcoder/prisma-vs-drizzle-orm-in-2026-what-you-really-need-to-know-9598cf4eaa7c)
- [Node.js ORMs in 2025 - TheDataGuy](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/)

---

## Authentication Flow

### Recommended: NextAuth.js with Google OAuth

NextAuth.js (now Auth.js v5) remains the best choice for Next.js applications in 2026, offering deep integration with the App Router and Server Components.

### Architecture:

```
┌──────────────┐
│   Client     │
│  (Browser)   │
└──────┬───────┘
       │ 1. Click "Sign in with Google"
       ▼
┌──────────────────────────────────────────────────────────┐
│               Next.js API Route                          │
│           /api/auth/[...nextauth]                        │
└──────┬───────────────────────────────────────────────────┘
       │ 2. Redirect to Google OAuth
       ▼
┌──────────────────────────────────────────────────────────┐
│               Google OAuth 2.0                           │
│    (Authentication & Authorization)                      │
└──────┬───────────────────────────────────────────────────┘
       │ 3. User grants permission
       ▼
┌──────────────────────────────────────────────────────────┐
│          OAuth Callback                                  │
│       /api/auth/callback/google                          │
└──────┬───────────────────────────────────────────────────┘
       │ 4. Exchange code for tokens
       ▼
┌──────────────────────────────────────────────────────────┐
│            NextAuth Session Creation                     │
│    - Create/update user in database                      │
│    - Generate session token                              │
│    - Set secure HTTP-only cookie                         │
└──────┬───────────────────────────────────────────────────┘
       │ 5. Redirect to application
       ▼
┌──────────────────────────────────────────────────────────┐
│           Authenticated Application                      │
│    - Session available server-side                       │
│    - Middleware checks authentication                    │
└──────────────────────────────────────────────────────────┘
```

### Implementation:

**1. Install Dependencies:**
```bash
npm install next-auth@beta @auth/drizzle-adapter
```

**2. Configuration (lib/auth.ts):**
```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Optional: restrict to specific domain
          // hd: "yourdomain.com"
        }
      }
    }),
  ],
  session: {
    strategy: 'database', // Use database sessions for better security
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Add custom fields to session
        session.user.telegramChatId = user.telegramChatId;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Optional: Custom validation
      // Check email_verified from Google
      if (account?.provider === 'google' && profile?.email_verified === false) {
        return false; // Reject unverified emails
      }
      return true;
    },
  },
  events: {
    async signIn({ user }) {
      // Update last login timestamp
      await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));
    },
  },
});
```

**3. API Route Handler (app/api/auth/[...nextauth]/route.ts):**
```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

**4. Middleware for Protected Routes (middleware.ts):**
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**5. Client Component (Login Button):**
```typescript
'use client';

import { signIn } from 'next-auth/react';

export function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      className="btn-google"
    >
      Sign in with Google
    </button>
  );
}
```

**6. Server Component (Get Session):**
```typescript
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

### Security Best Practices:

1. **Token Storage**: Keep tokens server-side in database (never expose to client)
2. **Session Management**: Use database sessions for better control
3. **HTTPS Only**: Ensure all auth flows use HTTPS in production
4. **CSRF Protection**: NextAuth handles this automatically
5. **Email Verification**: Check `email_verified` from Google
6. **Domain Restriction**: Use `hd` parameter to restrict to specific domains
7. **MFA**: Consider adding TOTP for additional security layer

### Environment Variables:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_secret_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobhunt
```

### Google Cloud Console Setup:

1. Create OAuth 2.0 Client ID in Google Cloud Console
2. Set Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
3. Set Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`

**Sources:**
- [Top 5 authentication solutions for Next.js apps in 2026 - WorkOS](https://workos.com/blog/top-authentication-solutions-nextjs-2026)
- [Tutorial: Google OAuth in Next.js - Lucia Auth](https://lucia-auth.com/tutorials/google-oauth/nextjs)
- [How to implement Social Login (OAuth) in Next.js - Corbado](https://www.corbado.com/blog/nextjs-login-oauth)
- [NextAuth.js Google Provider Documentation](https://next-auth.js.org/providers/google)

---

## Real-Time Updates Strategy

### Recommendation: Conditional Real-Time Based on Requirements

For a job hunt application, real-time updates are **optional** but can enhance UX for:
- Interview reminders
- Application status changes
- New job notifications from Telegram bot

### Architecture Options:

#### Option 1: PostgreSQL LISTEN/NOTIFY + WebSockets (Recommended)

**Use when**: Self-hosted deployment (Docker, VPS, AWS Fargate)

```
┌──────────────┐
│  PostgreSQL  │
│   Database   │
└──────┬───────┘
       │ LISTEN/NOTIFY
       ▼
┌──────────────────────────────────────────────────────────┐
│           Next.js Custom Server                          │
│  ┌─────────────────┐      ┌──────────────────┐          │
│  │  API Routes     │      │  WebSocket       │          │
│  │  (HTTP)         │      │  Server          │          │
│  └────────┬────────┘      └─────────┬────────┘          │
└───────────┼───────────────────────────┼──────────────────┘
            │                           │
            ▼                           ▼
       ┌────────────────────────────────────┐
       │        React Client                │
       │  (WebSocket connection)            │
       └────────────────────────────────────┘
```

**Implementation:**

```typescript
// lib/db/notifications.ts
import { client } from '@/lib/db';

export async function setupDatabaseNotifications(io: Server) {
  await client.query('LISTEN application_updates');
  await client.query('LISTEN interview_reminders');

  client.on('notification', (msg) => {
    const channel = msg.channel;
    const payload = JSON.parse(msg.payload);

    // Emit to specific user's WebSocket room
    io.to(payload.userId).emit(channel, payload);
  });
}

// PostgreSQL trigger
CREATE OR REPLACE FUNCTION notify_application_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'application_updates',
    json_build_object(
      'userId', NEW.user_id,
      'applicationId', NEW.id,
      'status', NEW.status,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_update_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_application_update();
```

**Custom Server (server.js):**
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { setupDatabaseNotifications } = require('./lib/db/notifications');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST']
    }
  });

  // WebSocket authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    // Verify JWT or session token
    const user = await verifyToken(token);
    if (user) {
      socket.userId = user.id;
      socket.join(user.id); // Join user-specific room
      next();
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.userId);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.userId);
    });
  });

  // Setup PostgreSQL notifications
  setupDatabaseNotifications(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
```

**Pros:**
- No external dependencies (besides PostgreSQL)
- Low latency
- Direct database-to-client notifications
- Cost-effective

**Cons:**
- Requires persistent server (not compatible with Vercel serverless)
- More complex deployment
- Need to manage WebSocket connections

#### Option 2: Server-Sent Events (SSE) - Simpler Alternative

**Use when**: Serverless deployment (Vercel) or simpler requirements

```typescript
// app/api/notifications/route.ts
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Poll database for updates every 5 seconds
      const interval = setInterval(async () => {
        const updates = await checkForUpdates(session.user.id);
        if (updates.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(updates)}\n\n`)
          );
        }
      }, 5000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Pros:**
- Works with serverless (with timeout limitations)
- Simpler than WebSockets
- Built into browsers

**Cons:**
- One-way communication only
- May hit serverless timeout limits
- Less efficient than WebSockets

#### Option 3: Polling - Simplest Approach

**Use when**: Real-time isn't critical, or using fully serverless

```typescript
// Client-side polling
useEffect(() => {
  const pollInterval = setInterval(async () => {
    const response = await fetch('/api/notifications/check');
    const updates = await response.json();
    if (updates.length > 0) {
      setNotifications(updates);
    }
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(pollInterval);
}, []);
```

**Pros:**
- Extremely simple
- Works everywhere
- No persistent connections

**Cons:**
- Higher latency
- More database queries
- Less "real-time" feel

### Recommendation for Job Hunt App:

1. **Start with polling** - Simple and works with any deployment
2. **Add SSE** for notifications if needed on Vercel
3. **Upgrade to WebSockets + LISTEN/NOTIFY** if self-hosting and need true real-time

For most job hunt applications, **polling every 30-60 seconds is sufficient** since job applications aren't time-critical like chat apps.

**Sources:**
- [PostgreSQL LISTEN/NOTIFY: Real-Time Without Message Broker - Pedro Alonso](https://www.pedroalonso.net/blog/postgres-listen-notify-real-time/)
- [Building Real-Time Apps with Next.js and WebSockets - DEV Community](https://dev.to/danmusembi/building-real-time-apps-with-nextjs-and-websockets-2p39)
- [Using WebSockets with Next.js on Fly.io](https://fly.io/javascript-journal/websockets-with-nextjs/)

---

## Local Development Setup

### Docker Compose Configuration

**docker-compose.yml:**
```yaml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:17-alpine
    container_name: jobhunt-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-jobhunt}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - jobhunt-network

  # pgAdmin (Optional - Database Management UI)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: jobhunt-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@admin.com}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin}
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres
    networks:
      - jobhunt-network

  # Next.js Application (Development)
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: jobhunt-app
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-jobhunt}
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - NODE_ENV=development
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - jobhunt-network
    command: npm run dev

  # Redis (Optional - for rate limiting and caching)
  redis:
    image: redis:7-alpine
    container_name: jobhunt-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - jobhunt-network

volumes:
  postgres_data:
  pgadmin_data:
  redis_data:

networks:
  jobhunt-network:
    driver: bridge
```

**Dockerfile.dev:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

**.env.example:**
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=jobhunt
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobhunt

# pgAdmin
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=development
```

**.dockerignore:**
```
.next
node_modules
.git
.gitignore
.env
.env.local
.env*.local
README.md
.DS_Store
coverage
.vscode
.idea
*.log
npm-debug.log*
```

### Setup Instructions:

**1. Clone and Install:**
```bash
# Clone repository
git clone <your-repo>
cd jobhunt-app

# Create .env file from example
cp .env.example .env

# Edit .env with your actual credentials
nano .env
```

**2. Start Development Environment:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

**3. Database Setup:**
```bash
# Run migrations (from host or inside container)
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Access PostgreSQL CLI
docker exec -it jobhunt-postgres psql -U postgres -d jobhunt
```

**4. Access Services:**
- Next.js App: http://localhost:3000
- pgAdmin: http://localhost:5050
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Alternative: Local PostgreSQL (Without Docker)

**Install PostgreSQL:**
```bash
# macOS
brew install postgresql@17
brew services start postgresql@17

# Ubuntu/Debian
sudo apt install postgresql-17
sudo systemctl start postgresql

# Windows
# Download installer from postgresql.org
```

**Create Database:**
```bash
createdb jobhunt
psql jobhunt < scripts/init-db.sql
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate:pg",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

**Sources:**
- [Dockerizing a Next.js App with PostgreSQL and pgAdmin - DEV Community](https://dev.to/ankitparashar700/dockerizing-a-nextjs-app-with-postgresql-and-pgadmin-a-step-by-step-guide-153e)
- [Building a Local Development Environment - Alex Efimenko](https://www.alexefimenko.com/posts/nextjs-postgres-s3-locally)
- [Setup Next.js with Postgres, Prisma and Docker Compose - Jean-Marc Möckel](https://jean-marc.io/blog/setup-next.js-with-postgres-prisma-docker)

---

## Docker Containerization

### Production Docker Setup

**Dockerfile (Multi-stage Production Build):**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**next.config.js (for standalone output):**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Creates optimized production build
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Increase for resume uploads
    },
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile images
  },
};

module.exports = nextConfig;
```

**docker-compose.prod.yml:**
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:17-alpine
    container_name: jobhunt-postgres-prod
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - jobhunt-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: jobhunt-app-prod
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - jobhunt-network

  nginx:
    image: nginx:alpine
    container_name: jobhunt-nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - jobhunt-network

volumes:
  postgres_prod_data:

networks:
  jobhunt-network:
    driver: bridge
```

**nginx.conf (Reverse Proxy):**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect to HTTPS (comment out for local)
        # return 301 https://$host$request_uri;

        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # HTTPS configuration (add after obtaining SSL certificate)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/nginx/certs/fullchain.pem;
    #     ssl_certificate_key /etc/nginx/certs/privkey.pem;
    #
    #     location / {
    #         proxy_pass http://nextjs;
    #         # ... same proxy settings as above
    #     }
    # }
}
```

### Best Practices:

1. **Multi-stage Builds**: Reduce final image size (from ~1GB to ~200MB)
2. **Standalone Output**: Only includes necessary files
3. **Non-root User**: Security best practice
4. **Health Checks**: Ensure services are ready before dependent services start
5. **Volume Management**: Persist database data, exclude node_modules
6. **Environment Variables**: Never commit secrets, use .env files
7. **.dockerignore**: Exclude unnecessary files from build context
8. **Restart Policies**: Auto-restart containers on failure

### Deployment Commands:

```bash
# Build production image
docker build -t jobhunt-app:latest .

# Run production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Database backup
docker exec jobhunt-postgres-prod pg_dump -U postgres jobhunt > backup.sql

# Database restore
docker exec -i jobhunt-postgres-prod psql -U postgres jobhunt < backup.sql

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up
docker system prune -a
```

### Cloud Deployment Options:

1. **AWS ECS/Fargate**: Managed container orchestration
2. **Google Cloud Run**: Serverless containers
3. **DigitalOcean App Platform**: Simple container deployment
4. **Railway.app**: Easy deployment with PostgreSQL
5. **Render.com**: Simple Docker deployments
6. **Fly.io**: Edge deployment with PostgreSQL

**Sources:**
- [Dockerizing a Next.js and Node.js App with PostgreSQL and Prisma - Medium](https://medium.com/@abhijariwala/dockerizing-a-next-js-and-node-js-app-with-postgresql-and-prisma-a-complete-guide-000527023e99)
- [Docker Next.js PostgreSQL Best Practices 2026 - Docker Forums](https://forums.docker.com/t/best-practices-for-using-docker-in-development-vs-production-nestjs-nextjs-monorepo/149461)

---

## Performance Optimization

### PostgreSQL Query Optimization for Large Job Datasets

#### 1. Indexing Strategies

**B-tree Indexes (Default):**
- Best for equality and range queries
- Use for primary keys, foreign keys, and commonly filtered columns

```sql
-- Already included in schema, but key indexes:
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_applications_status ON applications(status);
```

**GIN Indexes (Generalized Inverted Index):**
- Excellent for full-text search, arrays, JSONB
- Higher maintenance cost but faster searches

```sql
-- Full-text search on jobs
CREATE INDEX idx_jobs_search_vector ON jobs USING GIN(search_vector);

-- Array search on tags
CREATE INDEX idx_jobs_tags ON jobs USING GIN(tags);

-- JSONB search on document parsed data
CREATE INDEX idx_documents_parsed_data ON documents USING GIN(parsed_data);
```

**BRIN Indexes (Block Range Index):**
- Efficient for large tables with naturally sorted data
- Tiny index size, perfect for time-series data

```sql
-- Efficient for append-only time-series
CREATE INDEX idx_jobs_created_at_brin ON jobs USING BRIN(created_at);
CREATE INDEX idx_applications_applied_date_brin ON applications USING BRIN(applied_date);
```

**Partial Indexes:**
- Index only specific rows matching a condition
- Smaller, faster indexes for common queries

```sql
-- Only index active jobs
CREATE INDEX idx_jobs_active ON jobs(created_at) WHERE status = 'open';

-- Only index pending interviews
CREATE INDEX idx_interviews_pending ON interviews(scheduled_at)
  WHERE outcome = 'pending';
```

**Composite Indexes:**
- Index multiple columns together for specific query patterns

```sql
-- For queries filtering by user and status
CREATE INDEX idx_applications_user_status ON applications(user_id, status);

-- For queries filtering by user and date range
CREATE INDEX idx_jobs_user_created ON jobs(user_id, created_at DESC);
```

#### 2. Query Optimization Techniques

**Use EXPLAIN ANALYZE:**
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT j.*, COUNT(a.id) as application_count
FROM jobs j
LEFT JOIN applications a ON j.id = a.job_id
WHERE j.user_id = 'user-uuid'
  AND j.status = 'open'
GROUP BY j.id
ORDER BY j.created_at DESC
LIMIT 20;
```

**Optimize with Drizzle:**
```typescript
// Efficient pagination with cursor-based approach
import { db } from '@/lib/db';
import { jobs, applications } from '@/lib/db/schema';
import { eq, and, desc, lt, sql } from 'drizzle-orm';

export async function getJobsWithApplicationCount(
  userId: string,
  cursor?: string,
  limit = 20
) {
  const query = db
    .select({
      job: jobs,
      applicationCount: sql<number>`COUNT(${applications.id})::int`
    })
    .from(jobs)
    .leftJoin(applications, eq(jobs.id, applications.jobId))
    .where(
      and(
        eq(jobs.userId, userId),
        cursor ? lt(jobs.createdAt, new Date(cursor)) : undefined
      )
    )
    .groupBy(jobs.id)
    .orderBy(desc(jobs.createdAt))
    .limit(limit);

  return query;
}

// Full-text search with ranking
export async function searchJobs(userId: string, searchTerm: string) {
  return db
    .select({
      job: jobs,
      rank: sql<number>`ts_rank(search_vector, plainto_tsquery('english', ${searchTerm}))`
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, userId),
        sql`search_vector @@ plainto_tsquery('english', ${searchTerm})`
      )
    )
    .orderBy(desc(sql`ts_rank(search_vector, plainto_tsquery('english', ${searchTerm}))`))
    .limit(50);
}
```

#### 3. Materialized Views for Analytics

**Create Materialized View:**
```sql
-- Refresh daily for dashboard stats
CREATE MATERIALIZED VIEW user_application_stats AS
SELECT
  user_id,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
  COUNT(*) FILTER (WHERE status = 'interview') as interview_count,
  COUNT(*) FILTER (WHERE status = 'offer') as offer_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  ROUND(AVG(CASE
    WHEN status IN ('offer', 'accepted')
    THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400
  END)::numeric, 1) as avg_days_to_offer,
  MAX(applied_date) as last_application_date
FROM applications
GROUP BY user_id;

-- Create index on materialized view
CREATE INDEX idx_user_stats_user_id ON user_application_stats(user_id);

-- Refresh schedule (run daily via cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_application_stats;
```

**Use in Drizzle:**
```typescript
// Define as regular table in schema
export const userApplicationStats = pgView('user_application_stats').as((qb) =>
  qb.select({
    userId: applications.userId,
    totalApplications: sql<number>`COUNT(*)`,
    // ... other fields
  })
  .from(applications)
  .groupBy(applications.userId)
);

// Query like a normal table
const stats = await db
  .select()
  .from(userApplicationStats)
  .where(eq(userApplicationStats.userId, userId));
```

#### 4. Connection Pooling

**Configure Drizzle with postgres.js:**
```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// Connection pool configuration
export const client = postgres(connectionString, {
  max: 20, // Maximum pool size
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout
  prepare: false, // Disable prepared statements for pgBouncer compatibility
});

export const db = drizzle(client, { schema });
```

#### 5. Caching Strategy

**Redis Caching:**
```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedJobs(userId: string) {
  const cacheKey = `jobs:${userId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const jobs = await db.select().from(jobs).where(eq(jobs.userId, userId));

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(jobs));

  return jobs;
}

// Invalidate cache on update
export async function invalidateJobsCache(userId: string) {
  await redis.del(`jobs:${userId}`);
}
```

#### 6. Database Maintenance

**Regular Maintenance Schedule:**
```sql
-- Vacuum (reclaim space and update statistics)
VACUUM ANALYZE jobs;
VACUUM ANALYZE applications;

-- Reindex (rebuild indexes)
REINDEX TABLE jobs;

-- Update statistics (for query planner)
ANALYZE jobs;
```

**Automate with pg_cron:**
```sql
-- Install pg_cron extension
CREATE EXTENSION pg_cron;

-- Schedule nightly vacuum
SELECT cron.schedule('nightly-vacuum', '0 2 * * *', 'VACUUM ANALYZE');

-- Schedule weekly reindex
SELECT cron.schedule('weekly-reindex', '0 3 * * 0', 'REINDEX DATABASE jobhunt');
```

#### 7. Performance Monitoring

**Track Slow Queries:**
```sql
-- Enable slow query logging (postgresql.conf)
log_min_duration_statement = 1000  -- Log queries taking > 1s

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

**Monitor Index Usage:**
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';

-- Find missing indexes
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       seq_tup_read / seq_scan as avg_per_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 25;
```

### PostgreSQL 17 Performance Features (2026)

1. **Incremental VACUUM**: Reduces maintenance overhead by 60-70%
2. **Bi-directional Indexes**: Faster ORDER BY queries in both directions
3. **Parallel Execution**: Improved parallel query performance
4. **Better Memory Management**: Reduced memory overhead

These improvements provide significant performance gains for job hunt applications with large datasets.

**Sources:**
- [PostgreSQL Performance Tuning: Optimizing Database Indexes - Tiger Data](https://www.tigerdata.com/learn/postgresql-performance-tuning-optimizing-database-indexes)
- [PostgreSQL Index Best Practices - MyDBOps](https://www.mydbops.com/blog/postgresql-indexing-best-practices-guide)
- [PostgreSQL 17 Performance Upgrade 2026 - Medium](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577)
- [A Practical Guide to PostgreSQL Indexes - Percona](https://www.percona.com/blog/a-practical-guide-to-postgresql-indexes/)

---

## Technology Stack Summary

### Core Technologies

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Framework** | Next.js | 15 | App Router, RSC, Server Actions, SEO-optimized |
| **Runtime** | Node.js | 20 LTS | Stable, long-term support |
| **Language** | TypeScript | 5.x | Type safety, better DX |
| **Database** | PostgreSQL | 17 | Advanced features, performance improvements |
| **ORM** | Drizzle ORM | Latest | Performance, type safety, SQL transparency |
| **Authentication** | NextAuth.js | v5 (beta) | Next.js integration, OAuth support |
| **Styling** | Tailwind CSS | 3.x | Utility-first, fast development |
| **UI Components** | shadcn/ui | Latest | Accessible, customizable components |
| **Validation** | Zod | Latest | TypeScript-first schema validation |

### Supporting Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Containerization** | Docker | Local dev + production deployment |
| **Reverse Proxy** | Nginx | Load balancing, SSL termination |
| **Caching** | Redis (optional) | Rate limiting, session storage |
| **File Storage** | Local/S3 | Resume and document storage |
| **Real-time** | WebSockets/SSE | Optional real-time updates |
| **Bot API** | node-telegram-bot-api | Telegram integration |
| **HTTP Client** | Fetch API | Native, modern |
| **Date Handling** | date-fns | Lightweight alternative to moment.js |

### Development Tools

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Package Manager** | npm | Standard, reliable |
| **Linting** | ESLint | Code quality |
| **Formatting** | Prettier | Code consistency |
| **Testing** | Vitest + Testing Library | Fast, modern testing |
| **Type Checking** | TypeScript | Compile-time safety |
| **Git Hooks** | Husky | Pre-commit checks |
| **Database Tools** | Drizzle Kit | Migrations, schema management |
| **API Testing** | Bruno/Postman | API development |

### Deployment Options

**Serverless (Vercel):**
- ✅ Zero config deployment
- ✅ Automatic scaling
- ✅ Edge functions
- ❌ No WebSockets
- ❌ Limited customization

**Self-Hosted (Docker):**
- ✅ Full control
- ✅ WebSocket support
- ✅ Cost-effective at scale
- ❌ Requires DevOps knowledge
- ❌ Manual scaling

**Recommended**: Start with self-hosted Docker for full feature support, especially if WebSockets are needed.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Initialize Next.js 15 with App Router
2. Setup PostgreSQL with Docker Compose
3. Configure Drizzle ORM with schema
4. Implement NextAuth with Google OAuth
5. Create basic layout and navigation

### Phase 2: Core Features (Week 3-4)
1. Job listing CRUD operations
2. Application tracking system
3. Interview scheduling
4. Document upload/management
5. Dashboard with statistics

### Phase 3: Integrations (Week 5-6)
1. Telegram bot integration
2. Resume parsing (optional)
3. Email notifications
4. Real-time updates (if needed)

### Phase 4: Optimization (Week 7-8)
1. Implement caching strategy
2. Database query optimization
3. Performance monitoring
4. Security hardening
5. Production deployment

---

## Conclusion

This architecture provides a modern, scalable foundation for a job hunt application in 2026:

- **Future-proof**: Next.js 15 App Router with Server Components
- **Performant**: Drizzle ORM with PostgreSQL 17 optimization
- **Type-safe**: End-to-end TypeScript with Zod validation
- **Scalable**: Microservices-ready architecture with proper separation
- **Maintainable**: Clear organization and best practices
- **Flexible**: Can deploy serverless or self-hosted

The stack balances modern best practices with proven, stable technologies, ensuring the application can handle growth while remaining maintainable.

---

## Additional Resources

### Official Documentation
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [PostgreSQL 17 Documentation](https://www.postgresql.org/docs/17/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

### Community Resources
- [Next.js Discord](https://discord.gg/nextjs)
- [PostgreSQL Community](https://www.postgresql.org/community/)
- [Drizzle Discord](https://discord.gg/drizzle)

---

**Document prepared for:** Orion Job Hunt Application
**Architecture Type:** Full-Stack Next.js + PostgreSQL
**Target Deployment:** Docker + Self-Hosted / Vercel
**Last Updated:** 2026-02-02
