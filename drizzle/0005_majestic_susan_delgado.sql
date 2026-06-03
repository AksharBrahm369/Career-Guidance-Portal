ALTER TABLE "question_bank" ADD COLUMN "source" text DEFAULT 'authored' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "pool_group" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "media" jsonb;