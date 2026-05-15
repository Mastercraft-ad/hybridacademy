import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { academicTermsTable } from "./terms";

export const reportCardsTable = pgTable("report_cards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  termId: integer("term_id").notNull().references(() => academicTermsTable.id, { onDelete: "cascade" }),
  totalScore: numeric("total_score", { precision: 7, scale: 2 }).notNull().default("0"),
  average: numeric("average", { precision: 5, scale: 2 }).notNull().default("0"),
  position: integer("position").notNull().default(0),
  outOf: integer("out_of").notNull().default(0),
  daysPresent: integer("days_present"),
  daysAbsent: integer("days_absent"),
  teacherRemark: text("teacher_remark"),
  principalRemark: text("principal_remark"),
  nextTermBegins: text("next_term_begins"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReportCardSchema = createInsertSchema(reportCardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReportCard = z.infer<typeof insertReportCardSchema>;
export type ReportCard = typeof reportCardsTable.$inferSelect;
