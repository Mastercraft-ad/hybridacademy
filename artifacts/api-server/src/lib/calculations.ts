export interface GradeConfigEntry {
  minScore: string | number;
  maxScore: string | number;
  grade: string;
  remark: string;
}

export function calculateGrade(total: number, configs: GradeConfigEntry[]): { grade: string; remark: string } {
  const sorted = [...configs].sort((a, b) => Number(b.minScore) - Number(a.minScore));
  for (const cfg of sorted) {
    if (total >= Number(cfg.minScore) && total <= Number(cfg.maxScore)) {
      return { grade: cfg.grade, remark: cfg.remark };
    }
  }
  return { grade: "F9", remark: "Fail" };
}

export function calculatePositions(
  averages: { studentId: number; average: number }[]
): { studentId: number; position: number }[] {
  const sorted = [...averages].sort((a, b) => b.average - a.average);
  const result: { studentId: number; position: number }[] = [];
  let pos = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].average < sorted[i - 1].average) {
      pos = i + 1;
    }
    result.push({ studentId: sorted[i].studentId, position: pos });
  }
  return result;
}
