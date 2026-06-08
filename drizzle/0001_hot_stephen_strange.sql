CREATE TABLE "rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"key" text,
	"count" integer,
	"last_request" bigint,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
UPDATE "user" SET "phone_number_verified" = false WHERE "phone_number_verified" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "phone_number_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "phone_number_verified" SET NOT NULL;