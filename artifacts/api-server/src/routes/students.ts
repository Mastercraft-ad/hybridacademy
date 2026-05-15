import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, studentsTable, classesTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import {
  ListStudentsParams,
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentParams,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schools/:schoolId/students", async (req, res): Promise<void> => {
  const params = ListStudentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = ListStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(studentsTable.schoolId, params.data.schoolId)];
  if (query.data.classId) {
    conditions.push(eq(studentsTable.classId, query.data.classId));
  }

  const rows = await db
    .select({
      id: studentsTable.id,
      schoolId: studentsTable.schoolId,
      classId: studentsTable.classId,
      name: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      createdAt: studentsTable.createdAt,
      className: classesTable.name,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(and(...conditions))
    .orderBy(studentsTable.name);

  res.json(ListStudentsResponse.parse(serializeDates(rows)));
});

router.post("/schools/:schoolId/students", async (req, res): Promise<void> => {
  const params = CreateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db
    .insert(studentsTable)
    .values({ schoolId: params.data.schoolId, ...parsed.data })
    .returning();
  res.status(201).json(student);
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({
      id: studentsTable.id,
      schoolId: studentsTable.schoolId,
      classId: studentsTable.classId,
      name: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      createdAt: studentsTable.createdAt,
      className: classesTable.name,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(studentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(GetStudentResponse.parse(serializeDates(row)));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(UpdateStudentResponse.parse(serializeDates(student)));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
