CREATE TYPE "public"."assessment_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "assessments" RENAME COLUMN "innate_scores" TO "work_style_scores";--> statement-breakpoint
ALTER TABLE "assessments" RENAME COLUMN "recommended_stream" TO "known_stream";--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "status" "assessment_status" DEFAULT 'in_progress' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "responses" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "marks" jsonb;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "confidence" text;