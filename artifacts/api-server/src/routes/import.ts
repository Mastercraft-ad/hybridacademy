import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { eq, and, or, ilike } from "drizzle-orm";
import { db, studentsTable, subjectsTable, subjectScoresTable, gradeConfigsTable, classesTable } from "@workspace/db";
import { calculateGrade } from "../lib/calculations";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function normalise(s: unknown): string {
  return String(s ?? "").trim();
}

function findHeader(row: Record<string, unknown>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (found !== undefined) return found;
  }
  return undefined;
}

router.post("/schools/:schoolId/import/scores", upload.single("file"), async (req, res): Promise<void> => {
  const schoolId = Number(req.params.schoolId);
  const termId = Number(req.query.termId);

  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  if (!termId) { res.status(400).json({ error: "termId query param is required" }); return; }

  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } catch {
    res.status(400).json({ error: "Could not parse file. Please upload a valid CSV or Excel file." });
    return;
  }

  if (rows.length === 0) { res.status(400).json({ error: "File is empty or has no data rows." }); return; }

  const sampleRow = rows[0];
  const admNoKey  = findHeader(sampleRow, "AdmissionNo", "Admission No", "admission_no", "admno", "AdmNo");
  const nameKey   = findHeader(sampleRow, "StudentName", "Student Name", "Name", "student_name");
  const subjectKey = findHeader(sampleRow, "Subject", "SubjectName", "Subject Name", "subject_name");
  const testKey   = findHeader(sampleRow, "TestScore", "Test Score", "Test", "test_score", "CA");
  const examKey   = findHeader(sampleRow, "ExamScore", "Exam Score", "Exam", "exam_score");
  const scoreKey  = findHeader(sampleRow, "Score", "Total", "TotalScore", "total_score");

  if (!subjectKey) {
    res.status(400).json({ error: "Missing 'Subject' column. Expected columns: AdmissionNo (or StudentName), Subject, TestScore, ExamScore (or Score)." });
    return;
  }
  if (!admNoKey && !nameKey) {
    res.status(400).json({ error: "Missing student identifier column. Expected 'AdmissionNo' or 'StudentName'." });
    return;
  }
  if (!testKey && !examKey && !scoreKey) {
    res.status(400).json({ error: "Missing score column(s). Expected 'TestScore' + 'ExamScore', or 'Score' (total out of 100)." });
    return;
  }

  const [allStudents, allSubjects, gradeConfigs] = await Promise.all([
    db.select().from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(eq(studentsTable.schoolId, schoolId)),
    db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId)),
    db.select().from(gradeConfigsTable).where(eq(gradeConfigsTable.schoolId, schoolId)),
  ]);

  const studentByAdmNo = new Map(allStudents.map((r) => [r.students.admissionNo.toLowerCase(), r.students]));
  const studentByName  = new Map(allStudents.map((r) => [r.students.name.toLowerCase(), r.students]));
  const subjectByName  = new Map(allSubjects.map((s) => [s.name.toLowerCase(), s]));
  const subjectByCode  = new Map(allSubjects.map((s) => [String(s.code ?? "").toLowerCase(), s]));

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const admNo   = admNoKey   ? normalise(row[admNoKey]).toLowerCase()  : "";
    const rawName = nameKey    ? normalise(row[nameKey]).toLowerCase()   : "";
    const subjectRaw = normalise(row[subjectKey]);

    const student = (admNo && studentByAdmNo.get(admNo)) || (rawName && studentByName.get(rawName));
    if (!student) {
      errors.push({ row: rowNum, reason: `Student not found: "${admNoKey ? normalise(row[admNoKey!]) : normalise(row[nameKey!])}"` });
      skipped++;
      continue;
    }

    let subject = subjectByName.get(subjectRaw.toLowerCase()) ?? subjectByCode.get(subjectRaw.toLowerCase());
    if (!subject) {
      const [created] = await db.insert(subjectsTable).values({ schoolId, name: subjectRaw, code: null }).returning();
      subject = created;
      subjectByName.set(subjectRaw.toLowerCase(), subject);
    }

    let testScore: number;
    let examScore: number;

    if (scoreKey && (!testKey || !examKey)) {
      const total = Number(normalise(row[scoreKey])) || 0;
      testScore = Math.min(Math.round(total * 0.4), 40);
      examScore = Math.min(Math.round(total * 0.6), 60);
    } else {
      testScore = Math.min(Number(normalise(row[testKey!])) || 0, 40);
      examScore = Math.min(Number(normalise(row[examKey!])) || 0, 60);
    }

    const total = testScore + examScore;
    const { grade, remark } = calculateGrade(total, gradeConfigs);

    const existing = await db.select().from(subjectScoresTable).where(
      and(
        eq(subjectScoresTable.studentId, student.id),
        eq(subjectScoresTable.subjectId, subject.id),
        eq(subjectScoresTable.termId, termId)
      )
    );

    if (existing.length > 0) {
      await db.update(subjectScoresTable)
        .set({ testScore: String(testScore), examScore: String(examScore), total: String(total), grade, remark })
        .where(eq(subjectScoresTable.id, existing[0].id));
    } else {
      await db.insert(subjectScoresTable).values({
        studentId: student.id, subjectId: subject.id, termId,
        testScore: String(testScore), examScore: String(examScore),
        total: String(total), grade, remark,
      });
    }
    imported++;
  }

  res.json({ imported, skipped, errors, total: rows.length });
});

export default router;
