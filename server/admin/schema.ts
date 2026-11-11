import { z } from "zod";
import { ResultBatchStatus } from "@/generated/prisma/enums";

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

export type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;
export type CourseCreate = z.infer<typeof courseCreateSchema>;
export type OfferingCreate = z.infer<typeof offeringCreateSchema>;
export type OfferingUpdate = z.infer<typeof offeringUpdateSchema>;
export type ResultBatchQuery = z.infer<typeof resultBatchQuerySchema>;
export type ResultRejection = z.infer<typeof resultRejectionSchema>;
