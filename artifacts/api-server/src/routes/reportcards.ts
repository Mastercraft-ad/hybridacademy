import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { serializeDates } from "../lib/serialize";
import {
  db,
  reportCardsTable,
  studentsTable,
  classesTable,
  academicTermsTable,
  subjectScoresTable,
  subjectsTable,
  psychomotorRatingsTable,
  psychomotorTraitsTable,
  schoolsTable,
  gradeConfigsTable,
} from "@workspace/db";
import {
  ListReportCardsQueryParams,
  ListReportCardsResponse,
  GenerateReportCardsBody,
  GenerateReportCardsResponse,
  GetReportCardParams,
  GetReportCardResponse,
  UpdateReportCardParams,
  UpdateReportCardBody,
  UpdateReportCardResponse,
} from "@workspace/api-zod";
import { calculatePositions } from "../lib/calculations";

const router: IRouter = Router();

router.get("/reportcards", async (req, res): Promise<void> => {
  const query = ListReportCardsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(reportCardsTable.termId, query.data.termId)];
  if (query.data.studentId) {
    conditions.push(eq(reportCardsTable.studentId, query.data.studentId));
  }

  let studentIds: number[] | null = null;
  if (query.data.classId) {
    const classStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.classId, query.data.classId));
    studentIds = classStudents.map((s) => s.id);
  }

  const rows = await db
    .select({
      id: reportCardsTable.id,
      studentId: reportCardsTable.studentId,
      termId: reportCardsTable.termId,
      totalScore: reportCardsTable.totalScore,
      average: reportCardsTable.average,
      position: reportCardsTable.position,
      outOf: reportCardsTable.outOf,
      daysPresent: reportCardsTable.daysPresent,
      daysAbsent: reportCardsTable.daysAbsent,
      teacherRemark: reportCardsTable.teacherRemark,
      principalRemark: reportCardsTable.principalRemark,
      nextTermBegins: reportCardsTable.nextTermBegins,
      studentName: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      className: classesTable.name,
      session: academicTermsTable.session,
      term: academicTermsTable.term,
    })
    .from(reportCardsTable)
    .leftJoin(studentsTable, eq(reportCardsTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .leftJoin(academicTermsTable, eq(reportCardsTable.termId, academicTermsTable.id))
    .where(and(...conditions));

  let filtered = rows;
  if (studentIds !== null) {
    filtered = rows.filter((r) => studentIds!.includes(r.studentId));
  }

  res.json(
    ListReportCardsResponse.parse(
      serializeDates(filtered.map((r) => ({
        ...r,
        totalScore: Number(r.totalScore),
        average: Number(r.average),
      })))
    )
  );
});

router.post("/reportcards/generate", async (req, res): Promise<void> => {
  const parsed = GenerateReportCardsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { classId, termId } = parsed.data;

  const students = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.classId, classId));

  if (!students.length) {
    res.json([]);
    return;
  }

  const term = await db.select().from(academicTermsTable).where(eq(academicTermsTable.id, termId));
  if (!term.length) {
    res.status(404).json({ error: "Term not found" });
    return;
  }

  const gradeConfigs = await db
    .select()
    .from(gradeConfigsTable)
    .where(eq(gradeConfigsTable.schoolId, students[0].schoolId));

  const averages: { studentId: number; average: number; totalScore: number; subjectCount: number }[] = [];

  for (const student of students) {
    const scores = await db
      .select()
      .from(subjectScoresTable)
      .where(
        and(
          eq(subjectScoresTable.studentId, student.id),
          eq(subjectScoresTable.termId, termId)
        )
      );
    const totalScore = scores.reduce((sum, s) => sum + Number(s.total), 0);
    const avg = scores.length > 0 ? totalScore / scores.length : 0;
    averages.push({ studentId: student.id, average: avg, totalScore, subjectCount: scores.length });
  }

  const positions = calculatePositions(averages.map((a) => ({ studentId: a.studentId, average: a.average })));
  const outOf = students.length;

  const results = [];
  for (const student of students) {
    const avg = averages.find((a) => a.studentId === student.id)!;
    const pos = positions.find((p) => p.studentId === student.id)!;

    const existing = await db
      .select()
      .from(reportCardsTable)
      .where(
        and(
          eq(reportCardsTable.studentId, student.id),
          eq(reportCardsTable.termId, termId)
        )
      );

    let card;
    if (existing.length > 0) {
      const [updated] = await db
        .update(reportCardsTable)
        .set({
          totalScore: String(avg.totalScore),
          average: String(Math.round(avg.average * 100) / 100),
          position: pos.position,
          outOf,
          nextTermBegins: term[0].nextTermBegins ?? existing[0].nextTermBegins,
        })
        .where(eq(reportCardsTable.id, existing[0].id))
        .returning();
      card = updated;
    } else {
      const [inserted] = await db
        .insert(reportCardsTable)
        .values({
          studentId: student.id,
          termId,
          totalScore: String(avg.totalScore),
          average: String(Math.round(avg.average * 100) / 100),
          position: pos.position,
          outOf,
          nextTermBegins: term[0].nextTermBegins ?? null,
        })
        .returning();
      card = inserted;
    }
    results.push({ ...card, average: Number(card.average), totalScore: Number(card.totalScore) });
  }

  res.json(GenerateReportCardsResponse.parse(serializeDates(results)));
});

router.get("/reportcards/:id", async (req, res): Promise<void> => {
  const params = GetReportCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .select({
      id: reportCardsTable.id,
      studentId: reportCardsTable.studentId,
      termId: reportCardsTable.termId,
      totalScore: reportCardsTable.totalScore,
      average: reportCardsTable.average,
      position: reportCardsTable.position,
      outOf: reportCardsTable.outOf,
      daysPresent: reportCardsTable.daysPresent,
      daysAbsent: reportCardsTable.daysAbsent,
      teacherRemark: reportCardsTable.teacherRemark,
      principalRemark: reportCardsTable.principalRemark,
      nextTermBegins: reportCardsTable.nextTermBegins,
      studentName: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      gender: studentsTable.gender,
      className: classesTable.name,
      session: academicTermsTable.session,
      term: academicTermsTable.term,
      schoolName: schoolsTable.name,
      schoolAddress: schoolsTable.address,
      schoolMotto: schoolsTable.motto,
      schoolLogoUrl: schoolsTable.logoUrl,
    })
    .from(reportCardsTable)
    .leftJoin(studentsTable, eq(reportCardsTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .leftJoin(academicTermsTable, eq(reportCardsTable.termId, academicTermsTable.id))
    .leftJoin(schoolsTable, eq(studentsTable.schoolId, schoolsTable.id))
    .where(eq(reportCardsTable.id, params.data.id));

  if (!card) {
    res.status(404).json({ error: "Report card not found" });
    return;
  }

  const scores = await db
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
      subjectName: subjectsTable.name,
      studentName: studentsTable.name,
    })
    .from(subjectScoresTable)
    .leftJoin(subjectsTable, eq(subjectScoresTable.subjectId, subjectsTable.id))
    .leftJoin(studentsTable, eq(subjectScoresTable.studentId, studentsTable.id))
    .where(
      and(
        eq(subjectScoresTable.studentId, card.studentId),
        eq(subjectScoresTable.termId, card.termId)
      )
    )
    .orderBy(subjectsTable.name);

  const ratings = await db
    .select({
      id: psychomotorRatingsTable.id,
      studentId: psychomotorRatingsTable.studentId,
      traitId: psychomotorRatingsTable.traitId,
      termId: psychomotorRatingsTable.termId,
      rating: psychomotorRatingsTable.rating,
      traitName: psychomotorTraitsTable.name,
    })
    .from(psychomotorRatingsTable)
    .leftJoin(psychomotorTraitsTable, eq(psychomotorRatingsTable.traitId, psychomotorTraitsTable.id))
    .where(
      and(
        eq(psychomotorRatingsTable.studentId, card.studentId),
        eq(psychomotorRatingsTable.termId, card.termId)
      )
    );

  const detail = {
    ...card,
    average: Number(card.average),
    totalScore: Number(card.totalScore),
    scores: scores.map((s) => ({
      ...s,
      testScore: Number(s.testScore),
      examScore: Number(s.examScore),
      total: Number(s.total),
    })),
    ratings,
  };

  res.json(GetReportCardResponse.parse(serializeDates(detail)));
});

router.patch("/reportcards/:id", async (req, res): Promise<void> => {
  const params = UpdateReportCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReportCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [card] = await db
    .update(reportCardsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(reportCardsTable.id, params.data.id))
    .returning();
  if (!card) {
    res.status(404).json({ error: "Report card not found" });
    return;
  }
  res.json(UpdateReportCardResponse.parse(serializeDates({ ...card, average: Number(card.average), totalScore: Number(card.totalScore) })));
});

export default router;
