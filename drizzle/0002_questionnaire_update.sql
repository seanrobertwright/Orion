-- Migration: Update user_questionnaire table for 01-06 plan
-- Replace old questionnaire fields with new simplified structure

-- Drop old columns
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "desired_roles";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "desired_industries";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "desired_locations";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "remote_preference";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "desired_salary_min";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "desired_salary_max";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "years_of_experience";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "key_skills";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "job_search_status";
ALTER TABLE "user_questionnaire" DROP COLUMN IF EXISTS "start_date";

-- Add new columns
ALTER TABLE "user_questionnaire" ADD COLUMN "technical_skills" text;
ALTER TABLE "user_questionnaire" ADD COLUMN "years_experience" integer;
ALTER TABLE "user_questionnaire" ADD COLUMN "preferred_roles" text;
ALTER TABLE "user_questionnaire" ADD COLUMN "preferred_industries" text;
ALTER TABLE "user_questionnaire" ADD COLUMN "career_goals" text;
ALTER TABLE "user_questionnaire" ADD COLUMN "completed_at" timestamp;
