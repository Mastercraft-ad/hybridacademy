import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { classesTable } from "./classes";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  admissionNo: text("admission_no").notNull(),
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
