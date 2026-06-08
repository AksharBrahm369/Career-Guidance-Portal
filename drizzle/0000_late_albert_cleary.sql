CREATE TYPE "public"."ai_safety_tag" AS ENUM('ai_safe', 'ai_augmented', 'ai_risk');--> statement-breakpoint
CREATE TYPE "public"."assessment_module" AS ENUM('aptitude', 'interests', 'work_style');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'publish', 'archive', 'reject', 'login', 'ai_fetch');--> statement-breakpoint
CREATE TYPE "public"."course_source" AS ENUM('ai_fetch', 'manual');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'pending_review', 'published', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."institute_type" AS ENUM('government', 'private', 'deemed', 'autonomous', 'international');--> statement-breakpoint
CREATE TYPE "public"."ranking_tag" AS ENUM('top_tier', 'good', 'average', 'unranked');--> statement-breakpoint
CREATE TYPE "public"."stream" AS ENUM('science', 'commerce', 'arts', 'vocational');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'student');--> statement-breakpoint
CREATE TABLE "institutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"institute_type" "institute_type" NOT NULL,
	"ranking_tag" "ranking_tag" DEFAULT 'unranked' NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"region" text,
	"annual_fees_inr" numeric(12, 2),
	"website_url" text,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"best_fit_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_institutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"course_name" text NOT NULL,
	"course_code" text,
	"stream" "stream" NOT NULL,
	"career_clusters" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"ai_safety_tag" "ai_safety_tag" NOT NULL,
	"ai_safety_tag_ai" "ai_safety_tag",
	"ai_safety_reasoning" text,
	"description" text NOT NULL,
	"tenure_years" numeric(4, 2) NOT NULL,
	"eligibility_criteria" text NOT NULL,
	"entrance_exams" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"required_subjects" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"eligibility" jsonb,
	"fees_min_inr" numeric(12, 2),
	"fees_max_inr" numeric(12, 2),
	"source_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"source" "course_source" NOT NULL,
	"created_by_admin_id" uuid,
	"reviewed_by_admin_id" uuid,
	"last_edited_by_admin_id" uuid,
	"rejection_reason" text,
	"fetched_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "career_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_profile" jsonb NOT NULL,
	"lens_weights" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_clusters_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "assessment_status" DEFAULT 'in_progress' NOT NULL,
	"aptitude_scores" jsonb,
	"work_style_scores" jsonb,
	"interest_data" jsonb,
	"known_stream" text,
	"career_clusters_ranked" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"marks" jsonb,
	"subject_affinities" jsonb,
	"confidence" text,
	"cluster_scores" jsonb,
	"recommended_courses" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "question_bank" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "assessment_module" NOT NULL,
	"dimension" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option_id" text,
	"scoring_map" jsonb,
	"source" text DEFAULT 'authored' NOT NULL,
	"license" text,
	"version" integer DEFAULT 1 NOT NULL,
	"pool_group" text,
	"media" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"grade" integer,
	"cooldown_override" boolean DEFAULT false,
	"last_assessment_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_institutes" ADD CONSTRAINT "course_institutes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_institutes" ADD CONSTRAINT "course_institutes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_reviewed_by_admin_id_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_last_edited_by_admin_id_user_id_fk" FOREIGN KEY ("last_edited_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "institutes_state_idx" ON "institutes" USING btree ("state");--> statement-breakpoint
CREATE INDEX "institutes_status_idx" ON "institutes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "course_institutes_pair_uq" ON "course_institutes" USING btree ("course_id","institute_id");--> statement-breakpoint
CREATE INDEX "course_institutes_course_idx" ON "course_institutes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_institutes_institute_idx" ON "course_institutes" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_stream_idx" ON "courses" USING btree ("stream");--> statement-breakpoint
CREATE INDEX "career_clusters_active_idx" ON "career_clusters" USING btree ("active");--> statement-breakpoint
CREATE INDEX "assessments_student_idx" ON "assessments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "question_bank_module_idx" ON "question_bank" USING btree ("module");--> statement-breakpoint
CREATE INDEX "question_bank_active_idx" ON "question_bank" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audit_log_admin_idx" ON "audit_log" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");