import "server-only";

import type { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { sessionCookieOptions } from "@/server/auth/config";
import { requireUser, type AuthUser } from "@/server/auth/service";
import { studentPageQuerySchema, type StudentPageQuery } from "./schema";

export async function requireStudent(request: NextRequest): Promise<AuthUser> {
  const cookie = request.cookies.get(sessionCookieOptions().name)?.value;
  return requireUser(cookie, [UserRole.STUDENT]);
}

export function studentPageQuery(request: Request): StudentPageQuery {
  return studentPageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
