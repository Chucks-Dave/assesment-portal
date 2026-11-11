import "server-only";

import type { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { sessionCookieOptions } from "@/server/auth/config";
import { requireUser, type AuthUser } from "@/server/auth/service";
import { lecturerPageQuerySchema, type LecturerPageQuery } from "./schema";

export async function requireLecturer(request: NextRequest): Promise<AuthUser> {
  const cookie = request.cookies.get(sessionCookieOptions().name)?.value;
  return requireUser(cookie, [UserRole.LECTURER]);
}

export function lecturerPageQuery(request: Request): LecturerPageQuery {
  return lecturerPageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
