import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListSubjectsParams,
  ListSubjectsResponse,
  CreateSubjectParams,
  CreateSubjectBody,
  UpdateSubjectParams,
  UpdateSubjectBody,
  UpdateSubjectResponse,
  DeleteSubjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/subjects", async (req, res): Promise<void> => {
  const params = ListSubjectsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.schoolId, params.data.schoolId))
    .orderBy(subjectsTable.name);
  res.json(ListSubjectsResponse.parse(serializeDates(subjects)));
});

router.post("/schools/:schoolId/subjects", async (req, res): Promise<void> => {
  const params = CreateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db
    .insert(subjectsTable)
    .values({ schoolId: params.data.schoolId, ...parsed.data })
    .returning();
  res.status(201).json(subject);
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db
    .update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, params.data.id))
    .returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(UpdateSubjectResponse.parse(serializeDates(subject)));
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [subject] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
