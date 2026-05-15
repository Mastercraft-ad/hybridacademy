import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, academicTermsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListTermsParams,
  ListTermsResponse,
  CreateTermParams,
  CreateTermBody,
  UpdateTermParams,
  UpdateTermBody,
  UpdateTermResponse,
  DeleteTermParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/terms", async (req, res): Promise<void> => {
  const params = ListTermsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const terms = await db
    .select()
    .from(academicTermsTable)
    .where(eq(academicTermsTable.schoolId, params.data.schoolId))
    .orderBy(academicTermsTable.session, academicTermsTable.term);
  res.json(ListTermsResponse.parse(serializeDates(terms)));
});

router.post("/schools/:schoolId/terms", async (req, res): Promise<void> => {
  const params = CreateTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTermBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [term] = await db
    .insert(academicTermsTable)
    .values({ schoolId: params.data.schoolId, ...parsed.data })
    .returning();
  res.status(201).json(term);
});

router.patch("/terms/:id", async (req, res): Promise<void> => {
  const params = UpdateTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTermBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [term] = await db
    .update(academicTermsTable)
    .set(parsed.data)
    .where(eq(academicTermsTable.id, params.data.id))
    .returning();
  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.json(UpdateTermResponse.parse(serializeDates(term)));
});

router.delete("/terms/:id", async (req, res): Promise<void> => {
  const params = DeleteTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [term] = await db.delete(academicTermsTable).where(eq(academicTermsTable.id, params.data.id)).returning();
  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
