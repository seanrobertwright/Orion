# Job Hunt Assistant

## What This Is

A comprehensive job hunting platform that automates and intelligently manages the job search process. The tool searches multiple job boards, analyzes job fit against your skills, generates customized cover letters, provides resume tailoring suggestions, and tracks your entire application history with associated documents. It learns your preferences over time and recommends jobs you're most likely to get interviews for, while also offering interview preparation guidance.

## Core Value

Enable intelligent, organized, and efficient job hunting by automating job discovery and application management while learning what resonates with you — so you can focus on landing the right opportunity quickly.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can upload and store resumes (single or multiple versions)
- [ ] System extracts technical skills and proficiencies from uploaded resumes
- [ ] Users complete initial questionnaire about work preferences, skills, salary expectations, industry preferences
- [ ] System searches Indeed, LinkedIn, and Glassdoor for jobs
- [ ] Users can specify custom job boards for specialized industries
- [ ] System tracks all job searches and stores job listings
- [ ] Users can mark jobs as "interested" or "pass" and provide reasons
- [ ] System analyzes user skill match against job requirements
- [ ] System recommends jobs user is likely to get interviews for based on skill matching, role fit, salary, location, and historical success patterns
- [ ] System generates customized cover letters for specific jobs
- [ ] System provides resume tailoring suggestions for specific jobs (keyword optimization for ATS)
- [ ] Users can track application history with timestamps and associated documents (URLs, cover letters, resumes used)
- [ ] System learns from job feedback and interview outcomes
- [ ] System provides interview preparation guidance and materials
- [ ] System performs daily automated job board scans
- [ ] Telegram bot allows remote job searches and recommendations via messaging
- [ ] Telegram bot communicates with local server
- [ ] Web interface is responsive (mobile and desktop)
- [ ] Google OAuth authentication
- [ ] User profile settings for storing name, multiple resumes, cover letters

### Out of Scope

- Real-time chat with recruiters (focus on job discovery and tracking)
- Mobile-only app (web-first with responsive design, not native mobile)
- Salary negotiation guidance (beyond expectation setting in questionnaire)
- Networking features or community components in v1 (personal tool initially)

## Context

**Technical Environment:**
- Building with Next.js (full-stack web application)
- PostgreSQL for persistent data storage
- Docker for local deployment and containerization
- Claude AI (Anthropic) for intelligence layer
- Google OAuth for authentication
- Telegram Bot API for remote access
- Job board integration: Official APIs preferred, web scraping as fallback

**Motivation:**
The user needs to find a new job and wants to systematically manage the job search process. Rather than scattered applications across multiple browser tabs, this tool provides centralized tracking, intelligent recommendations, and AI-powered optimization.

**User Profile:**
- Salary expectation: $100k-$110k annually
- Open to career changes, not just staying in current field
- Willing to work remote or on-site depending on role
- Wants flexibility in industry/company type (some preferences on headcount vs startup culture)
- Will use this actively during job search and potentially share with others

## Constraints

- **Timeline**: No hard deadline — built with intention to be comprehensive and reusable rather than rushed
- **Deployment**: Initially local (Docker-based), running from home
- **Data**: Significant data storage needed (jobs, applications, documents, interview history)
- **Authentication**: Google OAuth integration required
- **Remote Access**: Telegram bot must communicate back to local server
- **AI Provider**: Single provider (Claude/Anthropic) for consistency, expandable later

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single AI provider (Claude) initially | Consistency, simpler maintenance, Claude strong at reasoning tasks needed for job matching and cover letter generation | — Pending |
| Next.js full-stack | Full control, single language, responsive by default, established ecosystem | — Pending |
| PostgreSQL for data storage | Structured data with complex relationships (jobs, applications, documents, interview notes), local deployment friendly | — Pending |
| Google OAuth | Easier for future users, reduces authentication complexity, familiar flow | — Pending |
| Telegram bot for remote access | Lightweight, ubiquitous, good for triggered searches and receiving recommendations while away from home | — Pending |
| Four-phase structure with all phases planned | Allows structured progression while committing to complete vision | — Pending |

---
*Last updated: 2026-02-02 after initialization*
