import { z } from "zod";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { AUTH } from "@/server/auth/constants";

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(AUTH.passwordMaxLength),
});
export type LoginInput = z.infer<typeof loginSchema>;
export const authUserSchema = z.strictObject({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: z.enum(UserRole),
  status: z.enum(UserStatus),
});
export type AuthUser = z.infer<typeof authUserSchema>;

const dashboardByRole = {
  [UserRole.STUDENT]: "/student/dashboard",
  [UserRole.LECTURER]: "/lecturer/dashboard",
  [UserRole.ADMIN]: "/admin/dashboard",
} as const;

export function dashboardPathFor(role: UserRole): typeof dashboardByRole[UserRole] {
  return dashboardByRole[role];
}
