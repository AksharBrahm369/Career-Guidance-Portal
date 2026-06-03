ALTER TABLE "courses" ADD COLUMN "required_subjects" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "eligibility" jsonb;