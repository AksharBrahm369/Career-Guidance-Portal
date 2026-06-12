ALTER TYPE "public"."audit_action" ADD VALUE 'delete';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'ban';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'unban';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'reset_password';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'reset_cooldown';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'reopen';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'restore';