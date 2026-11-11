import { z } from "zod";
export { loginSchema, type LoginInput } from "@/shared/auth";

export const emptyBodySchema = z.strictObject({});
