import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gradeConfigsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListGradeConfigsParams,
  ListGradeConfigsResponse,
  CreateGradeConfigParams,
  CreateGradeConfigBody,
  UpdateGradeConfigParams,
  UpdateGradeConfigBody,
  UpdateGradeConfigResponse,
  DeleteGradeConfigParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/grading", async (req, res): Promise<void> => {
  const params = ListGradeConfigsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const configs = await db
    .select()
    .from(gradeConfigsTable)
    .where(eq(gradeConfigsTable.schoolId, params.data.schoolId))
    .orderBy(gradeConfigsTable.minScore);
  res.json(
    ListGradeConfigsResponse.parse(
      serializeDates(configs.map((c) => ({
        ...c,
        minScore: Number(c.minScore),
        maxScore: Number(c.maxScore),
      })))
    )
  );
});

router.post("/schools/:schoolId/grading", async (req, res): Promise<void> => {
  const params = CreateGradeConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateGradeConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [config] = await db
    .insert(gradeConfigsTable)
    .values({
      schoolId: params.data.schoolId,
      minScore: String(parsed.data.minScore),
      maxScore: String(parsed.data.maxScore),
      grade: parsed.data.grade,
      remark: parsed.data.remark,
    })
    .returning();
  res.status(201).json({ ...config, minScore: Number(config.minScore), maxScore: Number(config.maxScore) });
});

router.patch("/grading/:id", async (req, res): Promise<void> => {
  const params = UpdateGradeConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGradeConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, string> = {};
  if (parsed.data.grade != null) updateData.grade = parsed.data.grade;
  if (parsed.data.remark != null) updateData.remark = parsed.data.remark;
  if (parsed.data.minScore != null) updateData.minScore = String(parsed.data.minScore);
  if (parsed.data.maxScore != null) updateData.maxScore = String(parsed.data.maxScore);

  const [config] = await db
    .update(gradeConfigsTable)
    .set(updateData)
    .where(eq(gradeConfigsTable.id, params.data.id))
    .returning();
  if (!config) {
    res.status(404).json({ error: "Grade config not found" });
    return;
  }
  res.json(UpdateGradeConfigResponse.parse(serializeDates({ ...config, minScore: Number(config.minScore), maxScore: Number(config.maxScore) })));
});

router.delete("/grading/:id", async (req, res): Promise<void> => {
  const params = DeleteGradeConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [config] = await db.delete(gradeConfigsTable).where(eq(gradeConfigsTable.id, params.data.id)).returning();
  if (!config) {
    res.status(404).json({ error: "Grade config not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
