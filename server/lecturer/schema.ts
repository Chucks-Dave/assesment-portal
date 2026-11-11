import { z } from "zod";

export const lecturerPageQuerySchema = z.strictObject({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  semesterId: z.string().min(1).optional(),
});

export const resultEntrySchema = z.strictObject({
  results: z.array(z.strictObject({
    registrationId: z.string().min(1),
    caScore: z.number().min(0).max(30),
    examScore: z.number().min(0).max(70),
  })).min(1).max(300),
});

export type LecturerPageQuery = z.infer<typeof lecturerPageQuerySchema>;
export type ResultEntry = z.infer<typeof resultEntrySchema>;
