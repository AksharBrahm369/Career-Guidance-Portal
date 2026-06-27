import { relations } from "drizzle-orm";
import { user } from "./auth";
import { assessments } from "./assessments";
import { auditLog } from "./audit-log";
import { courseLearningResources } from "./course-learning-resources";
import { courseInstitutes, courses } from "./courses";
import { institutes } from "./institutes";

export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [courses.createdByAdminId],
    references: [user.id],
    relationName: "courses_created_by",
  }),
  reviewedBy: one(user, {
    fields: [courses.reviewedByAdminId],
    references: [user.id],
  }),
  institutes: many(courseInstitutes),
  learningResources: many(courseLearningResources),
}));

export const institutesRelations = relations(institutes, ({ many }) => ({
  courses: many(courseInstitutes),
}));

export const courseInstitutesRelations = relations(courseInstitutes, ({ one }) => ({
  course: one(courses, {
    fields: [courseInstitutes.courseId],
    references: [courses.id],
  }),
  institute: one(institutes, {
    fields: [courseInstitutes.instituteId],
    references: [institutes.id],
  }),
}));

export const courseLearningResourcesRelations = relations(courseLearningResources, ({ one }) => ({
  course: one(courses, {
    fields: [courseLearningResources.courseId],
    references: [courses.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  student: one(user, {
    fields: [assessments.studentId],
    references: [user.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  admin: one(user, {
    fields: [auditLog.adminId],
    references: [user.id],
  }),
}));
