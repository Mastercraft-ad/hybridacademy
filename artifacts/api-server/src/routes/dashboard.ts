import { Router, type IRouter } from "express";
import { eq, and, avg, max, min, count, sql } from "drizzle-orm";
import {
  db,
  studentsTable,
  classesTable,
  subjectsTable,
  reportCardsTable,
  subjectScoresTable,
} from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetSubjectPerformanceQueryParams,
  GetSubjectPerformanceResponse,
  GetTopStudentsQueryParams,
  GetTopStudentsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const query = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { schoolId, termId } = query.data;

  const [totalStudents] = await db
    .select({ count: count() })
    .from(studentsTable)
    .where(eq(studentsTable.schoolId, schoolId));

  const [totalClasses] = await db
    .select({ count: count() })
    .from(classesTable)
    .where(eq(classesTable.schoolId, schoolId));

  const [totalSubjects] = await db
    .select({ count: count() })
    .from(subjectsTable)
    .where(eq(subjectsTable.schoolId, schoolId));

  const reportCards = await db
    .select({ average: reportCardsTable.average })
    .from(reportCardsTable)
    .leftJoin(studentsTable, eq(reportCardsTable.studentId, studentsTable.id))
    .where(and(eq(reportCardsTable.termId, termId), eq(studentsTable.schoolId, schoolId)));

  const averages = reportCards.map((r) => Number(r.average));
  const schoolAverage = averages.length > 0 ? averages.reduce((s, a) => s + a, 0) / averages.length : 0;
  const passCount = averages.filter((a) => a >= 50).length;
  const passRate = averages.length > 0 ? (passCount / averages.length) * 100 : 0;

  const classes = await db
    .select({ id: classesTable.id, name: classesTable.name })
    .from(classesTable)
    .where(eq(classesTable.schoolId, schoolId));

  const classAverages = [];
  for (const cls of classes) {
    const classStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.classId, cls.id));
    const studentIds = classStudents.map((s) => s.id);

    if (studentIds.length === 0) {
      classAverages.push({ classId: cls.id, className: cls.name, average: 0, studentCount: 0 });
      continue;
    }

    const cards = await db
      .select({ average: reportCardsTable.average })
      .from(reportCardsTable)
      .where(
        and(
          eq(reportCardsTable.termId, termId),
          sql`${reportCardsTable.studentId} = ANY(${sql.raw(`ARRAY[${studentIds.join(",")}]::int[]`)})`
        )
      );
    const classAvg = cards.length > 0 ? cards.reduce((s, c) => s + Number(c.average), 0) / cards.length : 0;
    classAverages.push({ classId: cls.id, className: cls.name, average: Math.round(classAvg * 100) / 100, studentCount: classStudents.length });
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalStudents: totalStudents.count,
      totalClasses: totalClasses.count,
      totalSubjects: totalSubjects.count,
      passRate: Math.round(passRate * 100) / 100,
      schoolAverage: Math.round(schoolAverage * 100) / 100,
      classAverages,
    })
  );
});

router.get("/dashboard/subject-performance", async (req, res): Promise<void> => {
  const query = GetSubjectPerformanceQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { termId, classId } = query.data;

  const classStudents = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.classId, classId));
  const studentIds = classStudents.map((s) => s.id);

  if (!studentIds.length) {
    res.json([]);
    return;
  }

  const subjects = await db
    .select({ id: subjectsTable.id, name: subjectsTable.name })
    .from(subjectsTable)
    .leftJoin(subjectScoresTable, eq(subjectScoresTable.subjectId, subjectsTable.id))
    .where(eq(subjectScoresTable.termId, termId))
    .groupBy(subjectsTable.id, subjectsTable.name);

  const result = [];
  for (const subject of subjects) {
    const scores = await db
      .select({ total: subjectScoresTable.total })
      .from(subjectScoresTable)
      .where(
        and(
          eq(subjectScoresTable.subjectId, subject.id),
          eq(subjectScoresTable.termId, termId),
          sql`${subjectScoresTable.studentId} = ANY(${sql.raw(`ARRAY[${studentIds.join(",")}]::int[]`)})`
        )
      );
    if (!scores.length) continue;
    const totals = scores.map((s) => Number(s.total));
    const average = totals.reduce((a, b) => a + b, 0) / totals.length;
    result.push({
      subjectId: subject.id,
      subjectName: subject.name,
      average: Math.round(average * 100) / 100,
      highestScore: Math.max(...totals),
      lowestScore: Math.min(...totals),
    });
  }

  res.json(GetSubjectPerformanceResponse.parse(result));
});

router.get("/dashboard/top-students", async (req, res): Promise<void> => {
  const query = GetTopStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { termId, classId, limit = 10 } = query.data;

  let conditions = [eq(reportCardsTable.termId, termId)];

  const rows = await db
    .select({
      studentId: reportCardsTable.studentId,
      average: reportCardsTable.average,
      position: reportCardsTable.position,
      studentName: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      className: classesTable.name,
      classId: studentsTable.classId,
    })
    .from(reportCardsTable)
    .leftJoin(studentsTable, eq(reportCardsTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(and(...conditions))
    .orderBy(sql`${reportCardsTable.average} DESC`)
    .limit(limit ?? 10);

  let filtered = rows;
  if (classId) {
    filtered = rows.filter((r) => r.classId === classId);
  }

  res.json(
    GetTopStudentsResponse.parse(
      filtered.slice(0, limit ?? 10).map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName ?? "",
        admissionNo: r.admissionNo ?? "",
        className: r.className ?? "",
        average: Number(r.average),
        position: r.position,
      }))
    )
  );
});

export default router;
