import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const gradeConfigsTable = pgTable("grade_configs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "cascade" }),
  minScore: numeric("min_score", { precision: 5, scale: 2 }).notNull(),
  maxScore: numeric("max_score", { precision: 5, scale: 2 }).notNull(),
  grade: text("grade").notNull(),
  remark: text("remark").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGradeConfigSchema = createInsertSchema(gradeConfigsTable).omit({ id: true, createdAt: true });
export type InsertGradeConfig = z.infer<typeof insertGradeConfigSchema>;
export type GradeConfig = typeof gradeConfigsTable.$inferSelect;
