# Requirements: Orion - Job Hunt Assistant

**Defined:** 2026-02-02
**Core Value:** Enable intelligent, organized, and efficient job hunting by automating job discovery and application management while learning what resonates with you — so you can focus on landing the right opportunity quickly.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in via Google OAuth
- [ ] **AUTH-02**: User can view and edit profile (name, email, salary expectations, work preferences)

### Job Discovery & Management

- [ ] **JOBS-01**: User can manually add jobs to track (title, company, location, URL, job description, requirements)
- [ ] **JOBS-02**: User can search and filter tracked jobs by title, company, location, or status
- [ ] **JOBS-03**: System can search Adzuna API for jobs based on keywords, location, and filters
- [ ] **JOBS-04**: System recommends jobs to user based on skill matching against their resume (scored 0-100)

### Application Tracking

- [ ] **APP-01**: User can track application status (saved, applied, interviewing, offered, rejected)
- [ ] **APP-02**: User can record application date, company, role, and notes for each application
- [ ] **APP-03**: User can link job URL, resume version, and cover letter to each application
- [ ] **APP-04**: User can schedule interviews and receive reminders
- [ ] **APP-05**: User can store interview notes and track outcome (pass, advance to next round, rejected)
- [ ] **APP-06**: System displays dashboard with application statistics (total applied, response rate, interview rate)

### Resume Management

- [ ] **RES-01**: User can upload resume (PDF, DOCX, or plain text) and store multiple versions
- [ ] **RES-02**: User can set a default resume for new applications
- [ ] **RES-03**: System extracts technical skills and work experience from uploaded resume using Claude AI
- [ ] **RES-04**: System provides resume tailoring suggestions for specific jobs (keyword optimization, positioning for ATS)

### Cover Letters

- [ ] **CV-01**: User can store cover letters and link them to applications
- [ ] **CV-02**: System generates customized cover letters for specific jobs using Claude AI

### Interview Preparation

- [ ] **INT-01**: User can store interview notes, questions asked, and company feedback
- [ ] **INT-02**: System provides interview preparation guidance and talking points based on job requirements using Claude AI

### Telegram Bot Integration

- [ ] **TG-01**: User can trigger job searches via Telegram bot commands (`/search`, `/status`)
- [ ] **TG-02**: System sends job recommendations to user via Telegram messages
- [ ] **TG-03**: User can check application status and receive notifications via Telegram

### Learning & Preferences

- [ ] **LEARN-01**: System asks user initial questionnaire about technical skills, work preferences, and career goals
- [ ] **LEARN-02**: System tracks which jobs user applies to vs. passes on (with optional user feedback on why)
- [ ] **LEARN-03**: System learns from interview outcomes to refine job recommendations
- [ ] **LEARN-04**: System continuously improves resume matching algorithm based on user feedback

## v2 Requirements

Deferred to future release. Not in current roadmap.

### Job Board Integration

- **JOBS-05**: Integration with ZipRecruiter API for additional job sources
- **JOBS-06**: Integration with Google Jobs API for aggregated job listings

### Advanced Features

- **ANALYTICS-01**: Advanced analytics and reporting on job search progress
- **ANALYTICS-02**: Visualization of application funnel and conversion rates

### Collaboration & Sharing

- **SHARE-01**: User can share job recommendations with others
- **SHARE-02**: User can generate shareable job search reports

### Browser Extension

- **EXT-01**: Browser extension to save jobs while browsing job boards
- **EXT-01**: One-click application tracking from job board pages

## Out of Scope

| Feature | Reason |
|---------|--------|
| Scraping Indeed, LinkedIn, or Glassdoor | High legal risk (ToS violations, litigation precedent), maintenance burden, unreliable data extraction. Use legitimate APIs (Adzuna, ZipRecruiter) instead. |
| Real-time chat with recruiters | Adds significant complexity; email/interview process sufficient for v1. |
| Native mobile app | Telegram bot serves as mobile interface for MVP; responsive web interface available for full feature access. |
| Networking/contact management | Personal tool focused on job applications; social features add scope. Consider for v2+. |
| Salary negotiation guidance | Captured in profile setup (salary expectations); deep negotiation coaching out of scope. |
| Multiple user accounts | Personal tool for individual use; multi-tenancy adds infrastructure complexity. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| JOBS-01 | Phase 1 | Pending |
| JOBS-02 | Phase 1 | Pending |
| JOBS-03 | Phase 5 | Pending |
| JOBS-04 | Phase 6 | Pending |
| APP-01 | Phase 1 | Pending |
| APP-02 | Phase 1 | Pending |
| APP-03 | Phase 1 | Pending |
| APP-04 | Phase 1 | Pending |
| APP-05 | Phase 1 | Pending |
| APP-06 | Phase 1 | Pending |
| RES-01 | Phase 3 | Pending |
| RES-02 | Phase 3 | Pending |
| RES-03 | Phase 4 | Pending |
| RES-04 | Phase 4 | Pending |
| CV-01 | Phase 1 | Pending |
| CV-02 | Phase 4 | Pending |
| INT-01 | Phase 1 | Pending |
| INT-02 | Phase 4 | Pending |
| TG-01 | Phase 2 | Pending |
| TG-02 | Phase 2 | Pending |
| TG-03 | Phase 2 | Pending |
| LEARN-01 | Phase 1 | Pending |
| LEARN-02 | Phase 1 | Pending |
| LEARN-03 | Phase 6 | Pending |
| LEARN-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*
