import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma, UserRole, UserStatus } from "@/generated/prisma/client";
import { prisma } from "../db";
import { HttpError } from "../http";
import { AUTH } from "./constants";
import { verifyPassword } from "./password";
import type { LoginInput } from "./schema";
import { throttleLogin } from "./throttle";

const publicUserSelect = { id: true, email: true, name: true, role: true, status: true } satisfies Prisma.UserSelect;
export type AuthUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
type LoginResult = { user: AuthUser; token: string; expiresAt: Date };
const tokenPattern = /^[a-f0-9]{64}$/;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function login(input: LoginInput, previousToken?: string): Promise<LoginResult> {
  await throttleLogin(input.email);
  const credentials = await prisma.user.findUnique({
    where: { email: input.email }, select: { id: true, passwordHash: true },
  });
  const valid = await verifyPassword(input.password, credentials?.passwordHash ?? null);
  if (!credentials || !valid) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  const token = randomBytes(AUTH.tokenBytes).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH.sessionSeconds * 1000);
  const user = await prisma.$transaction(async (tx): Promise<AuthUser> => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${credentials.id} FOR UPDATE`;
    const current = await tx.user.findUnique({
      where: { id: credentials.id }, select: { ...publicUserSelect, passwordHash: true },
    });
    if (!current || current.passwordHash !== credentials.passwordHash) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (current.status !== UserStatus.ACTIVE) {
      throw new HttpError(403, "ACCOUNT_DISABLED", "This account is not active.");
    }
    if (previousToken && tokenPattern.test(previousToken)) {
      await tx.session.deleteMany({ where: { tokenHash: tokenHash(previousToken) } });
    }
    await tx.session.create({ data: { userId: current.id, tokenHash: tokenHash(token), expiresAt } });
    return { id: current.id, email: current.email, name: current.name, role: current.role, status: current.status };
  });
  return { user, token, expiresAt };
}

export async function requireUser(token: string | undefined, roles?: readonly UserRole[]): Promise<AuthUser> {
  if (!token || !tokenPattern.test(token)) {
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication is required.");
  }
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { expiresAt: true, user: { select: publicUserSelect } },
  });
  if (!session || session.expiresAt <= new Date()) {
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication is required.");
  }
  if (session.user.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, "ACCOUNT_DISABLED", "This account is not active.");
  }
  if (roles && !roles.includes(session.user.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to access this resource.");
  }
  return session.user;
}

export async function logout(token: string | undefined): Promise<void> {
  if (token && tokenPattern.test(token)) {
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
}

export async function logoutAll(token: string | undefined): Promise<void> {
  const user = await requireUser(token);
  await prisma.$transaction(async (tx): Promise<void> => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
}
