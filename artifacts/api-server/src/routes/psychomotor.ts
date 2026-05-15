import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, psychomotorTraitsTable, psychomotorRatingsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListTraitsParams,
  ListTraitsResponse,
  CreateTraitParams,
  CreateTraitBody,
  UpdateTraitParams,
  UpdateTraitBody,
  UpdateTraitResponse,
  DeleteTraitParams,
  ListRatingsQueryParams,
  ListRatingsResponse,
  UpsertRatingBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/traits", async (req, res): Promise<void> => {
  const params = ListTraitsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const traits = await db
    .select()
    .from(psychomotorTraitsTable)
    .where(eq(psychomotorTraitsTable.schoolId, params.data.schoolId))
    .orderBy(psychomotorTraitsTable.displayOrder, psychomotorTraitsTable.name);
  res.json(ListTraitsResponse.parse(serializeDates(traits)));
});

router.post("/schools/:schoolId/traits", async (req, res): Promise<void> => {
  const params = CreateTraitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTraitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trait] = await db
    .insert(psychomotorTraitsTable)
    .values({ schoolId: params.data.schoolId, ...parsed.data })
    .returning();
  res.status(201).json(trait);
});

router.patch("/traits/:id", async (req, res): Promise<void> => {
  const params = UpdateTraitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTraitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trait] = await db
    .update(psychomotorTraitsTable)
    .set(parsed.data)
    .where(eq(psychomotorTraitsTable.id, params.data.id))
    .returning();
  if (!trait) {
    res.status(404).json({ error: "Trait not found" });
    return;
  }
  res.json(UpdateTraitResponse.parse(serializeDates(trait)));
});

router.delete("/traits/:id", async (req, res): Promise<void> => {
  const params = DeleteTraitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trait] = await db.delete(psychomotorTraitsTable).where(eq(psychomotorTraitsTable.id, params.data.id)).returning();
  if (!trait) {
    res.status(404).json({ error: "Trait not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/ratings", async (req, res): Promise<void> => {
  const query = ListRatingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(psychomotorRatingsTable.termId, query.data.termId)];
  if (query.data.studentId) {
    conditions.push(eq(psychomotorRatingsTable.studentId, query.data.studentId));
  }
  const rows = await db
    .select({
      id: psychomotorRatingsTable.id,
      studentId: psychomotorRatingsTable.studentId,
      traitId: psychomotorRatingsTable.traitId,
      termId: psychomotorRatingsTable.termId,
      rating: psychomotorRatingsTable.rating,
      createdAt: psychomotorRatingsTable.createdAt,
      traitName: psychomotorTraitsTable.name,
    })
    .from(psychomotorRatingsTable)
    .leftJoin(psychomotorTraitsTable, eq(psychomotorRatingsTable.traitId, psychomotorTraitsTable.id))
    .where(and(...conditions));
  res.json(ListRatingsResponse.parse(serializeDates(rows)));
});

router.post("/ratings", async (req, res): Promise<void> => {
  const parsed = UpsertRatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(psychomotorRatingsTable)
    .where(
      and(
        eq(psychomotorRatingsTable.studentId, parsed.data.studentId),
        eq(psychomotorRatingsTable.traitId, parsed.data.traitId),
        eq(psychomotorRatingsTable.termId, parsed.data.termId)
      )
    );
  let rating;
  if (existing.length > 0) {
    const [updated] = await db
      .update(psychomotorRatingsTable)
      .set({ rating: parsed.data.rating })
      .where(eq(psychomotorRatingsTable.id, existing[0].id))
      .returning();
    rating = updated;
  } else {
    const [inserted] = await db.insert(psychomotorRatingsTable).values(parsed.data).returning();
    rating = inserted;
  }
  res.json(rating);
});

export default router;
