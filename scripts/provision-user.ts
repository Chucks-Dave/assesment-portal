import "dotenv/config";

import { z } from "zod";
import { UserRole } from "../generated/prisma/client";
import { prisma } from "../server/db";
import { AUTH } from "../server/auth/constants";
import { hashPassword } from "../server/auth/password";

const provisionSchema = z.object({
  AUTH_USER_EMAIL: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  AUTH_USER_NAME: z.string().trim().min(1).max(120),
  AUTH_USER_PASSWORD: z.string().min(AUTH.passwordMinLength).max(AUTH.passwordMaxLength),
  AUTH_USER_ROLE: z.enum(UserRole),
});

async function main(): Promise<void> {
  const result = provisionSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Set valid AUTH_USER_EMAIL, AUTH_USER_NAME, AUTH_USER_PASSWORD (12–128 characters), and AUTH_USER_ROLE (STUDENT, LECTURER, ADMIN).");
    process.exitCode = 1;
    return;
  }
  const input = result.data;
  const passwordHash = await hashPassword(input.AUTH_USER_PASSWORD);
  await prisma.user.upsert({
    where: { email: input.AUTH_USER_EMAIL },
    update: {},
    create: {
      email: input.AUTH_USER_EMAIL,
      name: input.AUTH_USER_NAME,
      passwordHash,
      role: input.AUTH_USER_ROLE,
    },
  });
  console.info("Account provisioned. Existing accounts are left unchanged.");
}

main().catch((): void => {
  console.error("Account provisioning failed. Verify the database configuration and applied migrations.");
  process.exitCode = 1;
}).finally(async (): Promise<void> => {
  await prisma.$disconnect();
});
