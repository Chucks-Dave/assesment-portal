import { describe, expect, it } from "vitest";
import { calculateGpa } from "../server/student/grading";

describe("student GPA calculation", (): void => {
  it("uses credit-unit weighting and rounds only the final value", (): void => {
    expect(calculateGpa([
      { creditUnits: 3, gradePoint: 5 },
      { creditUnits: 2, gradePoint: 2 },
    ])).toEqual({ attemptedUnits: 5, gradePoints: 19, gpa: 3.8 });
  });

  it("includes failed units and reports no GPA for an empty result set", (): void => {
    expect(calculateGpa([{ creditUnits: 3, gradePoint: 0 }])).toEqual({
      attemptedUnits: 3, gradePoints: 0, gpa: 0,
    });
    expect(calculateGpa([])).toEqual({ attemptedUnits: 0, gradePoints: 0, gpa: null });
  });
});
