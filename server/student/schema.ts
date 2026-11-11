import { z } from "zod";
import { studentProfileUpdateSchema } from "@/shared/student";

export const studentPageQuerySchema = z.strictObject({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  semesterId: z.string().min(1).optional(),
});

export const registrationInputSchema = z.strictObject({
  offeringIds: z.array(z.string().min(1)).min(1).max(30),
});

export const profileUpdateSchema = studentProfileUpdateSchema;

export type StudentPageQuery = z.infer<typeof studentPageQuerySchema>;
export type RegistrationInput = z.infer<typeof registrationInputSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
