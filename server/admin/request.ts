import "server-only";

import type { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { sessionCookieOptions } from "@/server/auth/config";
import { requireUser, type AuthUser } from "@/server/auth/service";
import { adminPageQuerySchema, resultBatchQuerySchema, type AdminPageQuery, type ResultBatchQuery } from "./schema";

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const cookie = request.cookies.get(sessionCookieOptions().name)?.value;
  return requireUser(cookie, [UserRole.ADMIN]);
}

export function adminPageQuery(request: Request): AdminPageQuery {
  return adminPageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
}

export function resultBatchQuery(request: Request): ResultBatchQuery {
  return resultBatchQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
