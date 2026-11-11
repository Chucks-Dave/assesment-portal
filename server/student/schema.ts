import { z } from "zod";

export const studentPageQuerySchema = z.strictObject({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  semesterId: z.string().min(1).optional(),
});

export const registrationInputSchema = z.strictObject({
  offeringIds: z.array(z.string().min(1)).min(1).max(30),
});

export const profileUpdateSchema = z.strictObject({
  phone: z.string().trim().min(7).max(30).nullable().optional(),
  address: z.string().trim().min(5).max(250).nullable().optional(),
}).refine((value) => value.phone !== undefined || value.address !== undefined, {
  message: "At least one editable field is required.",
});

export type StudentPageQuery = z.infer<typeof studentPageQuerySchema>;
export type RegistrationInput = z.infer<typeof registrationInputSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
