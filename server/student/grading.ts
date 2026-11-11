export type GradeSummary = {
  attemptedUnits: number;
  gradePoints: number;
  gpa: number | null;
};

export type WeightedGrade = { creditUnits: number; gradePoint: number };

export function calculateGpa(results: readonly WeightedGrade[]): GradeSummary {
  const totals = results.reduce((summary, result) => ({
    attemptedUnits: summary.attemptedUnits + result.creditUnits,
    gradePoints: summary.gradePoints + result.creditUnits * result.gradePoint,
  }), { attemptedUnits: 0, gradePoints: 0 });
  return {
    ...totals,
    gpa: totals.attemptedUnits === 0 ? null : Number((totals.gradePoints / totals.attemptedUnits).toFixed(2)),
  };
}
