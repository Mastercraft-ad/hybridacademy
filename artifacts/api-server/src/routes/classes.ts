import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, classesTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListClassesParams,
  ListClassesResponse,
  CreateClassParams,
  CreateClassBody,
  UpdateClassParams,
  UpdateClassBody,
  UpdateClassResponse,
  DeleteClassParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/classes", async (req, res): Promise<void> => {
  const params = ListClassesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const classes = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.schoolId, params.data.schoolId))
    .orderBy(classesTable.name);
  res.json(ListClassesResponse.parse(serializeDates(classes)));
});

router.post("/schools/:schoolId/classes", async (req, res): Promise<void> => {
  const params = CreateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db
    .insert(classesTable)
    .values({ schoolId: params.data.schoolId, ...parsed.data })
    .returning();
  res.status(201).json(cls);
});

router.patch("/classes/:id", async (req, res): Promise<void> => {
  const params = UpdateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db
    .update(classesTable)
    .set(parsed.data)
    .where(eq(classesTable.id, params.data.id))
    .returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(UpdateClassResponse.parse(serializeDates(cls)));
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cls] = await db.delete(classesTable).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
