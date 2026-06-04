import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "student"]);

export const courseStatus = pgEnum("course_status", [
  "draft",
  "pending_review",
  "published",
  "archived",
  "rejected",
]);

export const courseSource = pgEnum("course_source", ["ai_fetch", "manual"]);

export const streamEnum = pgEnum("stream", [
  "science",
  "commerce",
  "arts",
  "vocational",
]);

export const aiSafetyTag = pgEnum("ai_safety_tag", [
  "ai_safe",
  "ai_augmented",
  "ai_risk",
]);

export const instituteType = pgEnum("institute_type", [
  "government",
  "private",
  "deemed",
  "autonomous",
  "international",
]);

export const rankingTag = pgEnum("ranking_tag", [
  "top_tier",
  "good",
  "average",
  "unranked",
]);

export const assessmentModule = pgEnum("assessment_module", [
  "aptitude",
  "interests",
  "work_style",
]);

export const assessmentStatus = pgEnum("assessment_status", ["in_progress", "completed"]);

export const auditAction = pgEnum("audit_action", [
  "create",
  "update",
  "publish",
  "archive",
  "reject",
  "login",
  "ai_fetch",
]);
