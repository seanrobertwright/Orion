# Phase Context: 01-Foundation & Core Tracking

This document outlines the UX and behavioral decisions for Phase 1, serving as the definitive guide for research and planning agents.

## 1. Dashboard & Visualization
- **Default View:** Kanban Board (Pipeline view).
- **Secondary View:** List View (Data density).
- **Key Metrics (Top of Dashboard):**
  - Jobs in Queue (Saved/Total Active)
  - Interviewed (Count of jobs that reached interview stage)
  - Stale Jobs (Jobs in 'Applied' status for >14 days without an update)
- **Stale Logic:** Any application in 'Applied' status with no activity/status change for 14+ days must be visually flagged (e.g., card turns red or displays a "Stale" warning).

## 2. Job Entry Workflow (Phase 1: Manual Only)
- **Primary Method:** Manual copy-paste.
- **Workflow:** User provides a URL first, then manually fills in details (Job Description, Requirements, Nice-to-haves).
- **Validation:** "Title" and "Company" are mandatory fields for saving a job.
- **Note:** Automated scraping and API integrations are explicitly deferred to Phases 4 and 5.

## 3. Application Status Lifecycle
- **Flow:** Fully Flexible. Users can move jobs between any statuses (e.g., Saved -> Offer) without forced linear progression.
- **History Tracking:** The system must silently log the timestamp and state of every status transition in the background to provide an audit trail of the application's journey.

## 4. Onboarding & Questionnaire
- **Experience:** Non-blocking (Option B).
- **Prompting:** A persistent but dismissible banner or notification appears on the dashboard prompting the user to complete their skills and preferences questionnaire.
- **Persistence:** The system should periodically remind the user until the questionnaire is 100% complete.

## Deferred Ideas (Out of Scope for Phase 1)
- Automated job board scraping (Phase 5)
- AI-powered resume parsing (Phase 4)
- Automated matching scores (Phase 6)
