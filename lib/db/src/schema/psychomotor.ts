import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { studentsTable } from "./students";
import { academicTermsTable } from "./terms";

export const psychomotorTraitsTable = pgTable("psychomotor_traits", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPsychomotorTraitSchema = createInsertSchema(psychomotorTraitsTable).omit({ id: true, createdAt: true });
export type InsertPsychomotorTrait = z.infer<typeof insertPsychomotorTraitSchema>;
export type PsychomotorTrait = typeof psychomotorTraitsTable.$inferSelect;

export const psychomotorRatingsTable = pgTable("psychomotor_ratings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  traitId: integer("trait_id").notNull().references(() => psychomotorTraitsTable.id, { onDelete: "cascade" }),
  termId: integer("term_id").notNull().references(() => academicTermsTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPsychomotorRatingSchema = createInsertSchema(psychomotorRatingsTable).omit({ id: true, createdAt: true });
export type InsertPsychomotorRating = z.infer<typeof insertPsychomotorRatingSchema>;
export type PsychomotorRating = typeof psychomotorRatingsTable.$inferSelect;
