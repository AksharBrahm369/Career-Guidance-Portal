CREATE TABLE "course_learning_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"platform" text NOT NULL,
	"resource_type" text NOT NULL,
	"description" text NOT NULL,
	"thumbnail_url" text,
	"language" text NOT NULL,
	"difficulty" text NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_learning_resources" ADD CONSTRAINT "course_learning_resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_learning_resources_course_status_idx" ON "course_learning_resources" USING btree ("course_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "course_learning_resources_course_url_uq" ON "course_learning_resources" USING btree ("course_id","url");