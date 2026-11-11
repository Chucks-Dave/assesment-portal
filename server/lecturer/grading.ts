export type Grade = { grade: string; gradePoint: number };

export function gradeFor(totalScore: number): Grade {
  if (totalScore >= 70) return { grade: "A", gradePoint: 5 };
  if (totalScore >= 60) return { grade: "B", gradePoint: 4 };
  if (totalScore >= 50) return { grade: "C", gradePoint: 3 };
  if (totalScore >= 45) return { grade: "D", gradePoint: 2 };
  if (totalScore >= 40) return { grade: "E", gradePoint: 1 };
  return { grade: "F", gradePoint: 0 };
}
