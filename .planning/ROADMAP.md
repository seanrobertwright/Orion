# Roadmap: Orion - Job Hunt Assistant

## Overview

Orion transforms job hunting from scattered browser tabs into an intelligent, organized system. Starting with core tracking and authentication (Phase 1), we layer on mobile access via Telegram bot (Phase 2), document management for resumes and cover letters (Phase 3), AI-powered resume parsing with Claude (Phase 4), legitimate job board integrations (Phase 5), and culminate with intelligent job matching and resume tailoring (Phase 6). Each phase delivers verifiable value while building toward a comprehensive job search platform that learns user preferences and automates tedious tasks.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Core Tracking** - Authentication, job tracking, application management, and dashboard
- [ ] **Phase 2: Telegram Bot Integration** - Remote access and notifications via Telegram
- [ ] **Phase 3: Document Management** - Resume and cover letter storage with version control
- [ ] **Phase 4: AI Resume Processing** - Claude-powered resume parsing and tailoring suggestions
- [ ] **Phase 5: Job Board APIs** - Legitimate job board integrations with Adzuna
- [ ] **Phase 6: Intelligent Matching & Tailoring** - AI-driven job matching and personalized recommendations

## Phase Details

### Phase 1: Foundation & Core Tracking
**Goal**: Users can authenticate, manually track jobs and applications, and view their job search dashboard
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, JOBS-01, JOBS-02, APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, CV-01, INT-01, LEARN-01, LEARN-02
**Success Criteria** (what must be TRUE):
  1. User can log in via Google OAuth and access their profile
  2. User can manually add jobs with title, company, location, URL, description, and requirements
  3. User can track application status for each job (saved, applied, interviewing, offered, rejected)
  4. User can link application date, notes, job URL, and cover letter to each application
  5. User can schedule interviews, add interview notes, and track interview outcomes
  6. User can view dashboard showing total applications, response rate, and interview rate
  7. User can complete initial questionnaire about technical skills and work preferences
  8. User can mark jobs as "interested" or "pass" with reasons to train the system
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 1`)

### Phase 2: Telegram Bot Integration
**Goal**: Users can remotely access job search functionality and receive notifications via Telegram
**Depends on**: Phase 1 (requires job tracking and application system)
**Requirements**: TG-01, TG-02, TG-03
**Success Criteria** (what must be TRUE):
  1. User can authenticate their Telegram account with the application
  2. User can trigger job searches using `/search` command with keywords and location
  3. User can check application status using `/status` command
  4. User receives Telegram notifications when application status changes
  5. User receives daily job recommendations via Telegram message
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 2`)

### Phase 3: Document Management
**Goal**: Users can upload, store, and manage multiple resume versions and cover letters
**Depends on**: Phase 1 (requires authentication and user profiles)
**Requirements**: RES-01, RES-02
**Success Criteria** (what must be TRUE):
  1. User can upload resume files in PDF, DOCX, or plain text format
  2. User can store multiple resume versions with custom names
  3. User can set one resume as default for new applications
  4. User can view list of all stored resumes and cover letters
  5. User can delete old resume versions
  6. User can link specific resume version to each application
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 3`)

### Phase 4: AI Resume Processing
**Goal**: System extracts skills from resumes and provides intelligent resume tailoring suggestions
**Depends on**: Phase 3 (requires document storage infrastructure)
**Requirements**: RES-03, RES-04, CV-02, INT-02
**Success Criteria** (what must be TRUE):
  1. System automatically extracts technical skills and work experience from uploaded resume
  2. User can view parsed skills and work history in their profile
  3. System generates customized cover letter for specific job using Claude AI
  4. System provides resume tailoring suggestions for specific job (keyword optimization for ATS)
  5. System provides interview preparation guidance based on job requirements
  6. User can accept or reject tailoring suggestions to improve future recommendations
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 4`)

### Phase 5: Job Board APIs
**Goal**: System automatically searches legitimate job boards and imports matching jobs
**Depends on**: Phase 1 (requires job storage system)
**Requirements**: JOBS-03
**Success Criteria** (what must be TRUE):
  1. System can search Adzuna API using keywords, location, and salary filters
  2. User can trigger manual job board searches and view results
  3. System imports job listings into tracking system with normalized data
  4. System deduplicates jobs when same listing appears multiple times
  5. User can convert imported job listing to tracked application with one click
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 5`)

### Phase 6: Intelligent Matching & Tailoring
**Goal**: System recommends best-fit jobs based on skill matching and learns from user feedback
**Depends on**: Phase 4 (requires resume parsing) and Phase 5 (requires job board data)
**Requirements**: JOBS-04, LEARN-03, LEARN-04
**Success Criteria** (what must be TRUE):
  1. System analyzes skill match between user's resume and each job (scored 0-100)
  2. User can view match scores with explanation of matching/missing skills
  3. System recommends top jobs user is likely to get interviews for
  4. System learns from interview outcomes and adjusts future recommendations
  5. System continuously improves matching algorithm based on user feedback (applied vs. passed)
  6. Dashboard shows top 10 recommended jobs sorted by match score
**Plans**: TBD

Plans:
- [ ] TBD (plans created during `/gsd:plan-phase 6`)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Tracking | 0/TBD | Not started | - |
| 2. Telegram Bot Integration | 0/TBD | Not started | - |
| 3. Document Management | 0/TBD | Not started | - |
| 4. AI Resume Processing | 0/TBD | Not started | - |
| 5. Job Board APIs | 0/TBD | Not started | - |
| 6. Intelligent Matching & Tailoring | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-02*
*Last updated: 2026-02-02*
