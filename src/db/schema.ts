import { pgTable, text, timestamp, uuid, varchar, pgEnum, index, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// NextAuth Tables (standard schema for Auth.js v5)
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),

  // Profile fields
  title: text('title'), // e.g., "Senior Software Engineer"
  location: text('location'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  resume: text('resume'), // URL to resume file
  bio: text('bio'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ============================================================================
// Application-specific Enums
// ============================================================================

export const applicationStatusEnum = pgEnum('application_status', [
  'saved',
  'applied',
  'interviewing',
  'offered',
  'rejected',
]);

export const interviewTypeEnum = pgEnum('interview_type', [
  'phone_screen',
  'technical',
  'behavioral',
  'system_design',
  'onsite',
  'final',
  'other',
]);

export const interviewOutcomeEnum = pgEnum('interview_outcome', [
  'pending',
  'passed',
  'failed',
  'cancelled',
]);

export const jobFeedbackTypeEnum = pgEnum('job_feedback_type', [
  'interested',
  'not_interested',
  'maybe',
]);

// ============================================================================
// Jobs Table
// ============================================================================

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Required fields
  title: text('title').notNull(),
  company: text('company').notNull(),

  // Optional fields
  location: text('location'),
  url: text('url'),
  description: text('description'),
  requirements: text('requirements'), // JSON or text list
  niceToHaves: text('nice_to_haves'), // JSON or text list
  salary: text('salary'),

  // Metadata
  source: text('source'), // e.g., "LinkedIn", "Indeed", "Company Website", "Referral"
  isRemote: boolean('is_remote').default(false),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('jobs_user_id_idx').on(table.userId),
  companyIdx: index('jobs_company_idx').on(table.company),
}));

// ============================================================================
// Applications Table
// ============================================================================

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  // Application status
  status: applicationStatusEnum('status').notNull().default('saved'),

  // Application details
  appliedDate: timestamp('applied_date', { mode: 'date' }),
  resumeUsed: text('resume_used'), // URL or version identifier
  coverLetterId: uuid('cover_letter_id').references(() => coverLetters.id),

  // Additional fields
  notes: text('notes'),
  contactPerson: text('contact_person'),
  referral: text('referral'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('applications_user_id_idx').on(table.userId),
  jobIdIdx: index('applications_job_id_idx').on(table.jobId),
  statusIdx: index('applications_status_idx').on(table.status),
}));

// ============================================================================
// Status History Table (silent logging)
// ============================================================================

export const statusHistory = pgTable('status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),

  fromStatus: applicationStatusEnum('from_status'),
  toStatus: applicationStatusEnum('to_status').notNull(),

  // Optional context
  notes: text('notes'),

  // Timestamp
  changedAt: timestamp('changed_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  applicationIdIdx: index('status_history_application_id_idx').on(table.applicationId),
}));

// ============================================================================
// Interviews Table
// ============================================================================

export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),

  // Interview details
  type: interviewTypeEnum('type').notNull(),
  scheduledAt: timestamp('scheduled_at', { mode: 'date' }),
  duration: integer('duration'), // minutes
  location: text('location'), // physical address or "Zoom", "Google Meet", etc.
  interviewers: text('interviewers'), // JSON array or comma-separated

  // Outcome
  outcome: interviewOutcomeEnum('outcome').default('pending'),
  notes: text('notes'),
  feedback: text('feedback'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  applicationIdIdx: index('interviews_application_id_idx').on(table.applicationId),
  scheduledAtIdx: index('interviews_scheduled_at_idx').on(table.scheduledAt),
}));

// ============================================================================
// Cover Letters Table
// ============================================================================

export const coverLetters = pgTable('cover_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),

  // Content
  title: text('title').notNull(), // e.g., "Google - Software Engineer"
  content: text('content').notNull(),

  // Metadata
  isTemplate: boolean('is_template').default(false),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('cover_letters_user_id_idx').on(table.userId),
  jobIdIdx: index('cover_letters_job_id_idx').on(table.jobId),
}));

// ============================================================================
// User Questionnaire Table (non-blocking onboarding)
// ============================================================================

export const userQuestionnaire = pgTable('user_questionnaire', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Career preferences
  desiredRoles: text('desired_roles'), // JSON array
  desiredIndustries: text('desired_industries'), // JSON array
  desiredLocations: text('desired_locations'), // JSON array
  remotePreference: text('remote_preference'), // "remote", "hybrid", "onsite", "flexible"

  // Compensation
  desiredSalaryMin: integer('desired_salary_min'),
  desiredSalaryMax: integer('desired_salary_max'),

  // Experience
  yearsOfExperience: integer('years_of_experience'),
  keySkills: text('key_skills'), // JSON array

  // Job search preferences
  jobSearchStatus: text('job_search_status'), // "actively_looking", "passively_looking", "not_looking"
  startDate: text('start_date'), // "immediate", "2_weeks", "1_month", "flexible"

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ============================================================================
// Job Feedback Table (learning system)
// ============================================================================

export const jobFeedback = pgTable('job_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  // Feedback
  feedbackType: jobFeedbackTypeEnum('feedback_type').notNull(),
  reason: text('reason'), // Optional explanation

  // Timestamp
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('job_feedback_user_id_idx').on(table.userId),
  jobIdIdx: index('job_feedback_job_id_idx').on(table.jobId),
}));

// ============================================================================
// Relations (for Drizzle ORM query builder)
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  jobs: many(jobs),
  applications: many(applications),
  coverLetters: many(coverLetters),
  questionnaire: one(userQuestionnaire),
  jobFeedback: many(jobFeedback),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
  applications: many(applications),
  coverLetters: many(coverLetters),
  feedback: many(jobFeedback),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  coverLetter: one(coverLetters, {
    fields: [applications.coverLetterId],
    references: [coverLetters.id],
  }),
  statusHistory: many(statusHistory),
  interviews: many(interviews),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  application: one(applications, {
    fields: [statusHistory.applicationId],
    references: [applications.id],
  }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
}));

export const coverLettersRelations = relations(coverLetters, ({ one, many }) => ({
  user: one(users, {
    fields: [coverLetters.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [coverLetters.jobId],
    references: [jobs.id],
  }),
  applications: many(applications),
}));

export const userQuestionnaireRelations = relations(userQuestionnaire, ({ one }) => ({
  user: one(users, {
    fields: [userQuestionnaire.userId],
    references: [users.id],
  }),
}));

export const jobFeedbackRelations = relations(jobFeedback, ({ one }) => ({
  user: one(users, {
    fields: [jobFeedback.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [jobFeedback.jobId],
    references: [jobs.id],
  }),
}));
