import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schoolsTable } from "@workspace/db";
import {
  GetSchoolParams,
  UpdateSchoolParams,
  UpdateSchoolBody,
  DeleteSchoolParams,
  CreateSchoolBody,
  ListSchoolsResponse,
  GetSchoolResponse,
  UpdateSchoolResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).orderBy(schoolsTable.id);
  res.json(ListSchoolsResponse.parse(serializeDates(schools)));
});

router.post("/schools", async (req, res): Promise<void> => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [school] = await db.insert(schoolsTable).values(parsed.data).returning();
  res.status(201).json(GetSchoolResponse.parse(serializeDates(school)));
});

router.get("/schools/:id", async (req, res): Promise<void> => {
  const params = GetSchoolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, params.data.id));
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.json(GetSchoolResponse.parse(serializeDates(school)));
});

router.patch("/schools/:id", async (req, res): Promise<void> => {
  const params = UpdateSchoolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [school] = await db
    .update(schoolsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schoolsTable.id, params.data.id))
    .returning();
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.json(UpdateSchoolResponse.parse(serializeDates(school)));
});

router.delete("/schools/:id", async (req, res): Promise<void> => {
  const params = DeleteSchoolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [school] = await db.delete(schoolsTable).where(eq(schoolsTable.id, params.data.id)).returning();
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
