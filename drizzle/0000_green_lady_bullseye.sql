CREATE TYPE "public"."ai_safety_tag" AS ENUM('ai_safe', 'ai_augmented', 'ai_risk');--> statement-breakpoint
CREATE TYPE "public"."assessment_module" AS ENUM('aptitude', 'innate', 'interests');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'publish', 'archive', 'reject', 'login', 'ai_fetch');--> statement-breakpoint
CREATE TYPE "public"."course_source" AS ENUM('ai_fetch', 'manual');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'pending_review', 'published', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."institute_type" AS ENUM('government', 'private', 'deemed', 'autonomous', 'international');--> statement-breakpoint
CREATE TYPE "public"."ranking_tag" AS ENUM('top_tier', 'good', 'average', 'unranked');--> statement-breakpoint
CREATE TYPE "public"."stream" AS ENUM('science', 'commerce', 'arts', 'vocational');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'student');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"name" text NOT NULL,
	"grade" integer,
	"cooldown_override" boolean DEFAULT false NOT NULL,
	"last_assessment_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_email_unique" UNIQUE("email"),
	CONSTRAINT "students_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
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
	"description" text NOT NULL,
	"tenure_years" numeric(4, 2) NOT NULL,
	"eligibility_criteria" text NOT NULL,
	"entrance_exams" text[] DEFAULT ARRAY[]::text[] NOT NULL,
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
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"aptitude_scores" jsonb,
	"innate_scores" jsonb,
	"interest_data" jsonb,
	"recommended_stream" text,
	"career_clusters_ranked" text[] DEFAULT ARRAY[]::text[] NOT NULL,
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
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_reviewed_by_admin_id_admins_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_last_edited_by_admin_id_admins_id_fk" FOREIGN KEY ("last_edited_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "institutes_state_idx" ON "institutes" USING btree ("state");--> statement-breakpoint
CREATE INDEX "institutes_status_idx" ON "institutes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_stream_idx" ON "courses" USING btree ("stream");--> statement-breakpoint
CREATE INDEX "assessments_student_idx" ON "assessments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "question_bank_module_idx" ON "question_bank" USING btree ("module");--> statement-breakpoint
CREATE INDEX "question_bank_active_idx" ON "question_bank" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audit_log_admin_idx" ON "audit_log" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");