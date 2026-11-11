import { z } from "zod";
import { ResultBatchStatus, UserRole, UserStatus } from "@/generated/prisma/enums";
import { AUTH } from "@/server/auth/constants";

const id = z.string().min(1);

export const adminPageQuerySchema = z.strictObject({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  departmentId: id.optional(),
  semesterId: id.optional(),
  programId: id.optional(),
});

export const courseCreateSchema = z.strictObject({
  departmentId: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,8}[0-9]{3}[A-Z]?$/, "Use a code such as CSC201.").max(20),
  title: z.string().trim().min(3).max(160),
  defaultCreditUnits: z.number().int().min(1).max(12),
});

export const offeringCreateSchema = z.strictObject({
  courseId: id,
  semesterId: id,
  programId: id,
  lecturerId: id.nullable().optional(),
  level: z.number().int().min(100).max(1000).multipleOf(100),
  creditUnits: z.number().int().min(1).max(12),
});

export const offeringUpdateSchema = z.strictObject({
  lecturerId: id.nullable().optional(),
  creditUnits: z.number().int().min(1).max(12).optional(),
}).refine((value) => value.lecturerId !== undefined || value.creditUnits !== undefined, {
  message: "At least one editable field is required.",
});

export const resultBatchQuerySchema = z.strictObject({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(ResultBatchStatus).default(ResultBatchStatus.SUBMITTED),
});

export const resultRejectionSchema = z.strictObject({ feedback: z.string().trim().min(10).max(500) });

export const adminUserQuerySchema = z.strictObject({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
});

export const adminUserCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(AUTH.passwordMinLength).max(AUTH.passwordMaxLength),
  role: z.enum(UserRole),
  programId: id.optional(),
  matricNumber: z.string().trim().toUpperCase().min(5).max(40).optional(),
  level: z.number().int().min(100).max(1000).multipleOf(100).optional(),
  departmentId: id.optional(),
}).superRefine((input, context) => {
  if (input.role === UserRole.STUDENT && (!input.programId || !input.matricNumber || !input.level)) {
    context.addIssue({ code: "custom", message: "Students require a programme, matriculation number, and level." });
  }
  if (input.role === UserRole.LECTURER && !input.departmentId) {
    context.addIssue({ code: "custom", message: "Lecturers require a department." });
  }
  if (input.role !== UserRole.STUDENT && (input.programId || input.matricNumber || input.level)) {
    context.addIssue({ code: "custom", message: "Student academic fields are only valid for student accounts." });
  }
  if (input.role !== UserRole.LECTURER && input.departmentId) {
    context.addIssue({ code: "custom", message: "Department assignment is only valid for lecturer accounts." });
  }
});

export const adminUserStatusSchema = z.strictObject({ status: z.enum(UserStatus) });
export const adminUserPasswordSchema = z.strictObject({ password: z.string().min(AUTH.passwordMinLength).max(AUTH.passwordMaxLength) });

export type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;
export type CourseCreate = z.infer<typeof courseCreateSchema>;
export type OfferingCreate = z.infer<typeof offeringCreateSchema>;
export type OfferingUpdate = z.infer<typeof offeringUpdateSchema>;
export type ResultBatchQuery = z.infer<typeof resultBatchQuerySchema>;
export type ResultRejection = z.infer<typeof resultRejectionSchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminUserCreate = z.infer<typeof adminUserCreateSchema>;
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type AdminUserPassword = z.infer<typeof adminUserPasswordSchema>;
