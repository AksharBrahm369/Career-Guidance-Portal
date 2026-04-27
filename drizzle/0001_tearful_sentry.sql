ALTER TABLE "courses" ADD COLUMN "ai_safety_reasoning" text;--> statement-breakpoint
ALTER TABLE "course_institutes" ADD CONSTRAINT "course_institutes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_institutes" ADD CONSTRAINT "course_institutes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_institutes_pair_uq" ON "course_institutes" USING btree ("course_id","institute_id");--> statement-breakpoint
CREATE INDEX "course_institutes_course_idx" ON "course_institutes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_institutes_institute_idx" ON "course_institutes" USING btree ("institute_id");