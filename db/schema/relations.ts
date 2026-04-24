import { relations } from "drizzle-orm";
import { admins } from "./admins";
import { assessments } from "./assessments";
import { auditLog } from "./audit-log";
import { courseInstitutes, courses } from "./courses";
import { institutes } from "./institutes";
import { students } from "./students";

export const adminsRelations = relations(admins, ({ many }) => ({
  coursesCreated: many(courses, { relationName: "courses_created_by" }),
  auditEntries: many(auditLog),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  assessments: many(assessments),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdBy: one(admins, {
    fields: [courses.createdByAdminId],
    references: [admins.id],
    relationName: "courses_created_by",
  }),
  reviewedBy: one(admins, {
    fields: [courses.reviewedByAdminId],
    references: [admins.id],
  }),
  institutes: many(courseInstitutes),
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

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  student: one(students, {
    fields: [assessments.studentId],
    references: [students.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  admin: one(admins, {
    fields: [auditLog.adminId],
    references: [admins.id],
  }),
}));
