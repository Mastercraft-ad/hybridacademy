import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  section: text("section"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true, createdAt: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classesTable.$inferSelect;
