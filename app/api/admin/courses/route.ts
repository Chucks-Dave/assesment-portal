import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { adminPageQuery, requireAdmin } from "@/server/admin/request";
import { courseCreateSchema } from "@/server/admin/schema";
import { createCourse, getCourses } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { await requireAdmin(request); return success("Courses loaded.", await getCourses(adminPageQuery(request))); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const user = await requireAdmin(request);
    return success("Course created.", await createCourse(user, courseCreateSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
