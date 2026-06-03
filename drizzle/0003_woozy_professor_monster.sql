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
CREATE INDEX "career_clusters_active_idx" ON "career_clusters" USING btree ("active");