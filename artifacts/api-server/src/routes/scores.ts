import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, subjectScoresTable, subjectsTable, studentsTable, gradeConfigsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListScoresQueryParams,
  ListScoresResponse,
  CreateScoreBody,
  BulkUpsertScoresBody,
  BulkUpsertScoresResponse,
  UpdateScoreParams,
  UpdateScoreBody,
  UpdateScoreResponse,
} from "@workspace/api-zod";
import { calculateGrade } from "../lib/calculations";

const router: IRouter = Router();

async function getGradeConfigs(schoolId: number) {
  const [student] = await db.select({ schoolId: studentsTable.schoolId }).from(studentsTable).where(eq(studentsTable.id, schoolId));
  return [];
}

router.get("/scores", async (req, res): Promise<void> => {
  const query = ListScoresQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(subjectScoresTable.termId, query.data.termId)];
  if (query.data.classId) {
    const classStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.classId, query.data.classId));
    const studentIds = classStudents.map((s) => s.id);
    if (studentIds.length === 0) {
      res.json([]);
      return;
    }
  }
  if (query.data.studentId) {
    conditions.push(eq(subjectScoresTable.studentId, query.data.studentId));
  }

  const rows = await db
    .select({
      id: subjectScoresTable.id,
      studentId: subjectScoresTable.studentId,
      subjectId: subjectScoresTable.subjectId,
      termId: subjectScoresTable.termId,
      testScore: subjectScoresTable.testScore,
      examScore: subjectScoresTable.examScore,
      total: subjectScoresTable.total,
      grade: subjectScoresTable.grade,
      remark: subjectScoresTable.remark,
      createdAt: subjectScoresTable.createdAt,
      updatedAt: subjectScoresTable.updatedAt,
      subjectName: subjectsTable.name,
      studentName: studentsTable.name,
    })
    .from(subjectScoresTable)
    .leftJoin(subjectsTable, eq(subjectScoresTable.subjectId, subjectsTable.id))
    .leftJoin(studentsTable, eq(subjectScoresTable.studentId, studentsTable.id))
    .where(and(...conditions));

  res.json(
    ListScoresResponse.parse(
      serializeDates(rows.map((r) => ({
        ...r,
        testScore: Number(r.testScore),
        examScore: Number(r.examScore),
        total: Number(r.total),
      })))
    )
  );
});

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = CreateScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const student = await db.select().from(studentsTable).where(eq(studentsTable.id, parsed.data.studentId));
  if (!student.length) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const gradeConfigs = await db
    .select()
    .from(gradeConfigsTable)
    .where(eq(gradeConfigsTable.schoolId, student[0].schoolId));

  const total = Number(parsed.data.testScore) + Number(parsed.data.examScore);
  const { grade, remark } = calculateGrade(total, gradeConfigs);

  const existing = await db
    .select()
    .from(subjectScoresTable)
    .where(
      and(
        eq(subjectScoresTable.studentId, parsed.data.studentId),
        eq(subjectScoresTable.subjectId, parsed.data.subjectId),
        eq(subjectScoresTable.termId, parsed.data.termId)
      )
    );

  let score;
  if (existing.length > 0) {
    const [updated] = await db
      .update(subjectScoresTable)
      .set({
        testScore: String(parsed.data.testScore),
        examScore: String(parsed.data.examScore),
        total: String(total),
        grade,
        remark,
      })
      .where(eq(subjectScoresTable.id, existing[0].id))
      .returning();
    score = updated;
  } else {
    const [inserted] = await db
      .insert(subjectScoresTable)
      .values({
        studentId: parsed.data.studentId,
        subjectId: parsed.data.subjectId,
        termId: parsed.data.termId,
        testScore: String(parsed.data.testScore),
        examScore: String(parsed.data.examScore),
        total: String(total),
        grade,
        remark,
      })
      .returning();
    score = inserted;
  }
  res.status(201).json({ ...score, testScore: Number(score.testScore), examScore: Number(score.examScore), total: Number(score.total) });
});

router.post("/scores/bulk", async (req, res): Promise<void> => {
  const parsed = BulkUpsertScoresBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const results = [];
  for (const scoreInput of parsed.data.scores) {
    const student = await db.select().from(studentsTable).where(eq(studentsTable.id, scoreInput.studentId));
    if (!student.length) continue;

    const gradeConfigs = await db
      .select()
      .from(gradeConfigsTable)
      .where(eq(gradeConfigsTable.schoolId, student[0].schoolId));

    const total = Number(scoreInput.testScore) + Number(scoreInput.examScore);
    const { grade, remark } = calculateGrade(total, gradeConfigs);

    const existing = await db
      .select()
      .from(subjectScoresTable)
      .where(
        and(
          eq(subjectScoresTable.studentId, scoreInput.studentId),
          eq(subjectScoresTable.subjectId, scoreInput.subjectId),
          eq(subjectScoresTable.termId, scoreInput.termId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(subjectScoresTable)
        .set({
          testScore: String(scoreInput.testScore),
          examScore: String(scoreInput.examScore),
          total: String(total),
          grade,
          remark,
        })
        .where(eq(subjectScoresTable.id, existing[0].id))
        .returning();
      results.push({ ...updated, testScore: Number(updated.testScore), examScore: Number(updated.examScore), total: Number(updated.total) });
    } else {
      const [inserted] = await db
        .insert(subjectScoresTable)
        .values({
          studentId: scoreInput.studentId,
          subjectId: scoreInput.subjectId,
          termId: scoreInput.termId,
          testScore: String(scoreInput.testScore),
          examScore: String(scoreInput.examScore),
          total: String(total),
          grade,
          remark,
        })
        .returning();
      results.push({ ...inserted, testScore: Number(inserted.testScore), examScore: Number(inserted.examScore), total: Number(inserted.total) });
    }
  }

  res.json(BulkUpsertScoresResponse.parse(serializeDates(results)));
});

router.patch("/scores/:id", async (req, res): Promise<void> => {
  const params = UpdateScoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(subjectScoresTable).where(eq(subjectScoresTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  const newTest = parsed.data.testScore != null ? Number(parsed.data.testScore) : Number(existing.testScore);
  const newExam = parsed.data.examScore != null ? Number(parsed.data.examScore) : Number(existing.examScore);
  const total = newTest + newExam;

  const student = await db.select().from(studentsTable).where(eq(studentsTable.id, existing.studentId));
  const gradeConfigs = student.length
    ? await db.select().from(gradeConfigsTable).where(eq(gradeConfigsTable.schoolId, student[0].schoolId))
    : [];
  const { grade, remark } = calculateGrade(total, gradeConfigs);

  const [score] = await db
    .update(subjectScoresTable)
    .set({ testScore: String(newTest), examScore: String(newExam), total: String(total), grade, remark })
    .where(eq(subjectScoresTable.id, params.data.id))
    .returning();
  res.json(UpdateScoreResponse.parse(serializeDates({ ...score, testScore: Number(score.testScore), examScore: Number(score.examScore), total: Number(score.total) })));
});

export default router;
