import { z } from "zod";
import { ResultBatchStatus, SemesterTerm, UserRole, UserStatus } from "@/generated/prisma/enums";
import { AUTH } from "@/server/auth/constants";

const departmentSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
const courseSchema = z.object({ id: z.string(), code: z.string(), title: z.string(), defaultCreditUnits: z.number().int().min(1).max(12), department: departmentSchema });
const offeringSchema = z.object({
  id: z.string(), level: z.number().int(), creditUnits: z.number().int(), course: courseSchema.omit({ department: true, defaultCreditUnits: true }),
  semester: z.object({ id: z.string(), term: z.enum(SemesterTerm), isActive: z.boolean(), registrationOpen: z.boolean(), session: z.object({ id: z.string(), name: z.string() }) }),
  program: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  lecturer: z.object({ id: z.string(), user: z.object({ name: z.string() }) }).nullable(),
  _count: z.object({ registrations: z.number().int() }),
});

export const adminDashboardResponseSchema = z.object({ payload: z.object({
  counts: z.object({ courses: z.number().int(), offerings: z.number().int(), students: z.number().int(), lecturers: z.number().int() }),
  activeSemester: z.object({ id: z.string(), term: z.enum(SemesterTerm), registrationOpen: z.boolean(), session: z.object({ id: z.string(), name: z.string() }) }).nullable(),
  recentOfferings: z.array(offeringSchema),
}) });

export const adminOptionsResponseSchema = z.object({ payload: z.object({
  departments: z.array(departmentSchema),
  programs: z.array(z.object({ id: z.string(), departmentId: z.string(), code: z.string(), name: z.string() })),
  semesters: z.array(z.object({ id: z.string(), term: z.enum(SemesterTerm), isActive: z.boolean(), session: z.object({ name: z.string() }) })),
  lecturers: z.array(z.object({ id: z.string(), departmentId: z.string(), user: z.object({ name: z.string() }) })),
  courses: z.array(courseSchema),
}) });

export const courseInputSchema = z.object({ departmentId: z.string().min(1, "Select a department."), code: z.string().trim().min(5, "Enter a course code.").max(20), title: z.string().trim().min(3, "Enter the course title.").max(160), defaultCreditUnits: z.number().int().min(1, "Units must be at least 1.").max(12, "Units cannot exceed 12.") });
export const offeringInputSchema = z.object({ courseId: z.string().min(1, "Select a course."), semesterId: z.string().min(1, "Select a semester."), programId: z.string().min(1, "Select a programme."), lecturerId: z.string(), level: z.number().int().min(100).max(1000), creditUnits: z.number().int().min(1).max(12) });
const resultBatchSummarySchema = z.object({ id: z.string(), status: z.enum(ResultBatchStatus), submittedAt: z.iso.datetime().nullable(), feedback: z.string().nullable(),
  submitter: z.object({ name: z.string() }), offering: z.object({ id: z.string(), level: z.number().int(), course: z.object({ code: z.string(), title: z.string() }),
    program: z.object({ code: z.string(), name: z.string() }), semester: z.object({ term: z.enum(SemesterTerm), session: z.object({ name: z.string() }) }),
    _count: z.object({ registrations: z.number().int() }) }), _count: z.object({ results: z.number().int() }) });
export const resultBatchListResponseSchema = z.object({ payload: z.object({ items: z.array(resultBatchSummarySchema), nextCursor: z.string().nullable() }) });
export const resultBatchDetailResponseSchema = z.object({ payload: resultBatchSummarySchema.extend({ reviewer: z.object({ name: z.string() }).nullable(), reviewedAt: z.iso.datetime().nullable(),
  results: z.array(z.object({ id: z.string(), caScore: z.number(), examScore: z.number(), totalScore: z.number(), grade: z.string(), gradePoint: z.number().int(),
    registration: z.object({ id: z.string(), student: z.object({ matricNumber: z.string(), user: z.object({ name: z.string() }) }) }) })) }) });
export const resultRejectionInputSchema = z.object({ feedback: z.string().trim().min(10, "Explain the required correction.").max(500) });
const adminUserSchema = z.object({
  id: z.string(), name: z.string(), email: z.email(), role: z.enum(UserRole), status: z.enum(UserStatus), createdAt: z.iso.datetime(),
  student: z.object({ matricNumber: z.string(), level: z.number().int(), program: z.object({ id: z.string(), code: z.string(), name: z.string() }) }).nullable(),
  lecturer: z.object({ department: departmentSchema }).nullable(),
  _count: z.object({ sessions: z.number().int() }),
});
export const adminUsersResponseSchema = z.object({ payload: z.object({ items: z.array(adminUserSchema), nextCursor: z.string().nullable(), currentUserId: z.string() }) });
export const adminUserResponseSchema = z.object({ payload: adminUserSchema });
export const adminUserInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the account holder’s name.").max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  password: z.string().min(AUTH.passwordMinLength, `Use at least ${AUTH.passwordMinLength} characters.`).max(AUTH.passwordMaxLength),
  role: z.enum(UserRole), programId: z.string(), matricNumber: z.string(), level: z.number().int(), departmentId: z.string(),
}).superRefine((input, context) => {
  if (input.role === UserRole.STUDENT && (!input.programId || !input.matricNumber || !input.level)) context.addIssue({ code: "custom", message: "Complete the student academic assignment." });
  if (input.role === UserRole.LECTURER && !input.departmentId) context.addIssue({ code: "custom", message: "Select the lecturer’s department." });
});
export const adminUserPasswordInputSchema = z.object({ password: z.string().min(AUTH.passwordMinLength, `Use at least ${AUTH.passwordMinLength} characters.`).max(AUTH.passwordMaxLength) });

export type AdminDashboard = z.infer<typeof adminDashboardResponseSchema>["payload"];
export type AdminOptions = z.infer<typeof adminOptionsResponseSchema>["payload"];
export type CourseInput = z.infer<typeof courseInputSchema>;
export type OfferingInput = z.infer<typeof offeringInputSchema>;
export type ResultBatchSummary = z.infer<typeof resultBatchSummarySchema>;
export type ResultBatchDetail = z.infer<typeof resultBatchDetailResponseSchema>["payload"];
export type ResultRejectionInput = z.infer<typeof resultRejectionInputSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserPage = z.infer<typeof adminUsersResponseSchema>["payload"];
export type AdminUserInput = z.infer<typeof adminUserInputSchema>;
export type AdminUserPasswordInput = z.infer<typeof adminUserPasswordInputSchema>;
