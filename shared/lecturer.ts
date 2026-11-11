import { z } from "zod";
import { ResultBatchStatus, SemesterTerm } from "@/generated/prisma/enums";

const batchSchema = z.object({ id: z.string(), status: z.enum(ResultBatchStatus), feedback: z.string().nullable(), submittedAt: z.iso.datetime().nullable() });
const offeringSchema = z.object({
  id: z.string(), level: z.number().int(), creditUnits: z.number().int(),
  course: z.object({ code: z.string(), title: z.string() }), program: z.object({ code: z.string(), name: z.string() }),
  semester: z.object({ id: z.string(), term: z.enum(SemesterTerm), isActive: z.boolean(), session: z.object({ name: z.string() }) }),
  resultBatches: z.array(batchSchema), _count: z.object({ registrations: z.number().int() }),
});

export const lecturerDashboardResponseSchema = z.object({ payload: z.object({
  lecturer: z.object({ id: z.string(), user: z.object({ name: z.string(), email: z.email() }), department: z.object({ code: z.string(), name: z.string() }) }),
  offerings: z.array(offeringSchema), summary: z.object({ assignedCourses: z.number().int(), registeredStudents: z.number().int(), submittedBatches: z.number().int() }),
}) });

export const offeringRosterResponseSchema = z.object({ payload: z.object({ offering: offeringSchema, registrations: z.array(z.object({
  id: z.string(), student: z.object({ matricNumber: z.string(), user: z.object({ name: z.string() }) }), result: z.object({ caScore: z.number(), examScore: z.number(), totalScore: z.number(), grade: z.string(), batch: z.object({ id: z.string(), status: z.enum(ResultBatchStatus), feedback: z.string().nullable() }) }).nullable(),
})) }) });

export const resultFormSchema = z.object({ results: z.array(z.object({ registrationId: z.string(), caScore: z.number().min(0, "Minimum is 0.").max(30, "CA cannot exceed 30."), examScore: z.number().min(0, "Minimum is 0.").max(70, "Exam cannot exceed 70.") })) });

export type LecturerDashboard = z.infer<typeof lecturerDashboardResponseSchema>["payload"];
export type LecturerOffering = LecturerDashboard["offerings"][number];
export type OfferingRoster = z.infer<typeof offeringRosterResponseSchema>["payload"];
export type ResultForm = z.infer<typeof resultFormSchema>;
