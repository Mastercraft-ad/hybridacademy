import {
  db,
  schoolsTable,
  classesTable,
  studentsTable,
  academicTermsTable,
  subjectsTable,
  gradeConfigsTable,
  psychomotorTraitsTable,
  psychomotorRatingsTable,
  subjectScoresTable,
  reportCardsTable,
} from "@workspace/db";

function getGrade(total: number, configs: { minScore: string; maxScore: string; grade: string; remark: string }[]) {
  for (const g of configs) {
    if (total >= Number(g.minScore) && total <= Number(g.maxScore)) return { grade: g.grade, remark: g.remark };
  }
  return { grade: "F9", remark: "Fail" };
}

async function seed() {
  // Check if already seeded
  const existing = await db.select().from(schoolsTable).limit(1);
  if (existing.length > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  // School
  const [school] = await db
    .insert(schoolsTable)
    .values({
      name: "Greenfield Academy",
      address: "15 Unity Avenue, Ikeja, Lagos",
      motto: "Knowledge, Integrity, Excellence",
    })
    .returning();

  console.log("Created school:", school.id);

  // Grade configs (Nigerian WAEC scale)
  const gradeData = [
    { minScore: "75", maxScore: "100", grade: "A1", remark: "Excellent" },
    { minScore: "70", maxScore: "74", grade: "B2", remark: "Very Good" },
    { minScore: "65", maxScore: "69", grade: "B3", remark: "Good" },
    { minScore: "60", maxScore: "64", grade: "C4", remark: "Credit" },
    { minScore: "55", maxScore: "59", grade: "C5", remark: "Credit" },
    { minScore: "50", maxScore: "54", grade: "C6", remark: "Credit" },
    { minScore: "45", maxScore: "49", grade: "D7", remark: "Pass" },
    { minScore: "40", maxScore: "44", grade: "E8", remark: "Pass" },
    { minScore: "0",  maxScore: "39", grade: "F9", remark: "Fail" },
  ];
  await db.insert(gradeConfigsTable).values(gradeData.map((g) => ({ schoolId: school.id, ...g })));
  console.log("Created grade configs");

  // Psychomotor traits
  const traitNames = ["Punctuality", "Neatness", "Attentiveness", "Politeness", "Cooperation", "Creativity", "Sports", "Music"];
  const insertedTraits = await db
    .insert(psychomotorTraitsTable)
    .values(traitNames.map((name, i) => ({ schoolId: school.id, name, displayOrder: i })))
    .returning();
  console.log("Created traits:", insertedTraits.length);

  // Term
  const [term] = await db
    .insert(academicTermsTable)
    .values({
      schoolId: school.id,
      session: "2025/2026",
      term: 1,
      startDate: "2025-09-09",
      endDate: "2025-12-12",
      nextTermBegins: "2026-01-12",
    })
    .returning();
  console.log("Created term:", term.id);

  // Classes
  const classData = [
    { name: "JSS 1", section: "A" },
    { name: "JSS 2", section: "A" },
    { name: "JSS 3", section: "A" },
    { name: "SSS 1", section: "A" },
    { name: "SSS 2", section: "A" },
    { name: "SSS 3", section: "A" },
  ];
  const insertedClasses = await db
    .insert(classesTable)
    .values(classData.map((c) => ({ schoolId: school.id, ...c })))
    .returning();
  console.log("Created classes:", insertedClasses.length);

  // Subjects
  const subjectNames = [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CVE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Agricultural Science", code: "AGR" },
    { name: "French", code: "FRN" },
  ];
  const insertedSubjects = await db
    .insert(subjectsTable)
    .values(subjectNames.map((s) => ({ schoolId: school.id, ...s })))
    .returning();
  console.log("Created subjects:", insertedSubjects.length);

  // Students across JSS 1–3 classes
  const allStudentNames = [
    ["Adaeze Okafor", "Bola Adeleke", "Chukwuemeka Nwosu", "Damilola Abiodun", "Emeka Eze",
     "Fatima Garba", "Grace Okonkwo", "Hassan Musa", "Ifeoma Chukwu", "James Oladipo",
     "Kemi Salako", "Lawal Ibrahim", "Miriam Okeke", "Nnamdi Anieto", "Oluwaseun Bello"],
    ["Pius Chukwuma", "Queen Ngozi", "Rita Obi", "Samuel Nwachukwu", "Tunde Bakare",
     "Ugo Eze", "Victoria Amadi", "Wale Adeyemi", "Xavier Nwosu", "Yetunde Fashola",
     "Zainab Abubakar", "Abel Ekwueme", "Blessing Ojo", "Chibuzor Egbo", "Dike Okonkwu"],
    ["Ekaete Udoh", "Funmilayo Oni", "Gbenga Adeyemi", "Helen Nwosu", "Idris Musa",
     "Joy Anyanwu", "Kabir Hassan", "Lara Ogundimu", "Musa Aliyu", "Nike Fadahunsi",
     "Obinna Ude", "Patricia Eze", "Rasheed Bello", "Sola Akinbode", "Titi Onabanjo"],
  ];

  let admissionCounter = 1;
  const allStudents: { id: number; classId: number }[] = [];

  for (let ci = 0; ci < 3; ci++) {
    const cls = insertedClasses[ci];
    const names = allStudentNames[ci];
    const students = await db
      .insert(studentsTable)
      .values(
        names.map((name, i) => ({
          schoolId: school.id,
          classId: cls.id,
          name,
          admissionNo: `GFA/2025/${String(admissionCounter++).padStart(3, "0")}`,
          gender: i % 2 === 0 ? "Female" : "Male",
        }))
      )
      .returning();
    students.forEach((s) => allStudents.push({ id: s.id, classId: cls.id }));
  }
  console.log("Created students:", allStudents.length);

  // Scores and report cards
  for (const cls of insertedClasses.slice(0, 3)) {
    const classStudents = allStudents.filter((s) => s.classId === cls.id);
    const studentAverages: { studentId: number; totalScore: number; avg: number }[] = [];

    for (const student of classStudents) {
      let totalScore = 0;
      for (const subject of insertedSubjects) {
        const testScore = Math.floor(Math.random() * 30) + 8;
        const examScore = Math.floor(Math.random() * 45) + 15;
        const total = testScore + examScore;
        const { grade, remark } = getGrade(total, gradeData);
        await db.insert(subjectScoresTable).values({
          studentId: student.id,
          subjectId: subject.id,
          termId: term.id,
          testScore: String(testScore),
          examScore: String(examScore),
          total: String(total),
          grade,
          remark,
        });
        totalScore += total;
      }
      const avg = totalScore / insertedSubjects.length;
      studentAverages.push({ studentId: student.id, totalScore, avg });

      // Psychomotor ratings
      for (const trait of insertedTraits) {
        await db.insert(psychomotorRatingsTable).values({
          studentId: student.id,
          traitId: trait.id,
          termId: term.id,
          rating: Math.floor(Math.random() * 3) + 3,
        });
      }
    }

    // Positions
    const sorted = [...studentAverages].sort((a, b) => b.avg - a.avg);
    const posMap = new Map<number, number>();
    let pos = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].avg < sorted[i - 1].avg) pos = i + 1;
      posMap.set(sorted[i].studentId, pos);
    }

    // Report cards
    for (const sa of studentAverages) {
      await db.insert(reportCardsTable).values({
        studentId: sa.studentId,
        termId: term.id,
        totalScore: String(Math.round(sa.totalScore * 100) / 100),
        average: String(Math.round(sa.avg * 100) / 100),
        position: posMap.get(sa.studentId) ?? 0,
        outOf: classStudents.length,
        nextTermBegins: term.nextTermBegins,
        daysPresent: Math.floor(Math.random() * 10) + 55,
        daysAbsent: Math.floor(Math.random() * 5),
      });
    }
    console.log(`Generated report cards for class ${cls.name}`);
  }

  console.log("Seed complete!");
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
