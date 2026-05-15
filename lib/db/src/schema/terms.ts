import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const academicTermsTable = pgTable("academic_terms", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "cascade" }),
  session: text("session").notNull(),
  term: integer("term").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  nextTermBegins: text("next_term_begins"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTermSchema = createInsertSchema(academicTermsTable).omit({ id: true, createdAt: true });
export type InsertTerm = z.infer<typeof insertTermSchema>;
export type AcademicTerm = typeof academicTermsTable.$inferSelect;
