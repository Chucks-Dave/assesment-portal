import { z } from "zod";
import { SemesterTerm } from "@/generated/prisma/enums";

const organizationSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
const semesterSchema = z.object({
  id: z.string(),
  term: z.enum(SemesterTerm),
  registrationOpen: z.boolean(),
  session: z.object({ id: z.string(), name: z.string() }),
});
const studentProfileSchema = z.object({
  id: z.string(), matricNumber: z.string(), level: z.number().int(),
  phone: z.string().nullable(), address: z.string().nullable(),
  user: z.object({ name: z.string(), email: z.email() }),
  program: organizationSchema.extend({ department: organizationSchema.extend({ faculty: organizationSchema }) }),
});
const gradeSummarySchema = z.object({
  attemptedUnits: z.number().int(), gradePoints: z.number(), gpa: z.number().nullable(),
});
const resultSchema = z.object({
  id: z.string(), caScore: z.number(), examScore: z.number(), totalScore: z.number(),
  grade: z.string(), gradePoint: z.number().int(),
  registration: z.object({
    creditUnitsSnapshot: z.number().int(),
    offering: z.object({
      course: z.object({ code: z.string(), title: z.string() }),
      semester: semesterSchema.omit({ registrationOpen: true }),
    }),
  }),
});

export const studentDashboardResponseSchema = z.object({ payload: z.object({
  student: studentProfileSchema,
  activeSemester: semesterSchema.nullable(),
  registeredUnits: z.number().int(),
  academicSummary: gradeSummarySchema,
}) });

export const studentRegistrationsResponseSchema = z.object({ payload: z.object({
  items: z.array(z.object({
    id: z.string(), registeredAt: z.iso.datetime(), creditUnitsSnapshot: z.number().int(),
    offering: z.object({ id: z.string(), course: z.object({ code: z.string(), title: z.string() }),
      semester: semesterSchema.omit({ registrationOpen: true }) }),
  })),
  nextCursor: z.string().nullable(),
}) });

export const studentOfferingsResponseSchema = z.object({ payload: z.object({
  items: z.array(z.object({
    id: z.string(), creditUnits: z.number().int(), registered: z.boolean(),
    course: z.object({ code: z.string(), title: z.string() }),
    semester: semesterSchema,
    lecturer: z.object({ user: z.object({ name: z.string() }) }).nullable(),
  })),
  nextCursor: z.string().nullable(),
}) });

export const studentResultsResponseSchema = z.object({ payload: z.object({
  items: z.array(resultSchema),
  nextCursor: z.string().nullable(),
  summary: gradeSummarySchema,
}) });

export const studentHistoryResponseSchema = z.object({ payload: z.object({
  items: z.array(z.object({
    semester: semesterSchema.omit({ registrationOpen: true }),
    grades: z.array(resultSchema),
    summary: gradeSummarySchema,
  })),
  nextCursor: z.string().nullable(),
  cumulative: gradeSummarySchema,
}) });

export type StudentDashboard = z.infer<typeof studentDashboardResponseSchema>["payload"];
export type StudentRegistration = z.infer<typeof studentRegistrationsResponseSchema>["payload"]["items"][number];
export type StudentOffering = z.infer<typeof studentOfferingsResponseSchema>["payload"]["items"][number];
export type StudentResultPage = z.infer<typeof studentResultsResponseSchema>["payload"];
export type StudentResult = StudentResultPage["items"][number];
export type StudentHistoryPage = z.infer<typeof studentHistoryResponseSchema>["payload"];
