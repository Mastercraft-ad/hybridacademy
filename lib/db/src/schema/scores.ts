import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { subjectsTable } from "./subjects";
import { academicTermsTable } from "./terms";

export const subjectScoresTable = pgTable("subject_scores", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  termId: integer("term_id").notNull().references(() => academicTermsTable.id, { onDelete: "cascade" }),
  testScore: numeric("test_score", { precision: 5, scale: 2 }).notNull().default("0"),
  examScore: numeric("exam_score", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 5, scale: 2 }).notNull().default("0"),
  grade: text("grade").notNull().default(""),
  remark: text("remark").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubjectScoreSchema = createInsertSchema(subjectScoresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubjectScore = z.infer<typeof insertSubjectScoreSchema>;
export type SubjectScore = typeof subjectScoresTable.$inferSelect;
