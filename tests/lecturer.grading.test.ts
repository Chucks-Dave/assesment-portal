import { describe, expect, it } from "vitest";
import { gradeFor } from "../server/lecturer/grading";

describe("lecturer grading", (): void => {
  it.each([[100, "A", 5], [70, "A", 5], [69.99, "B", 4], [60, "B", 4], [50, "C", 3], [45, "D", 2], [40, "E", 1], [39.99, "F", 0]])("grades %s", (score, grade, gradePoint): void => {
    expect(gradeFor(score)).toEqual({ grade, gradePoint });
  });
});
