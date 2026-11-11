import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireStudent, studentPageQuery } from "@/server/student/request";
import { registrationInputSchema } from "@/server/student/schema";
import { getRegistrations, registerCourses } from "@/server/student/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireStudent(request);
    return success("Registrations loaded.", await getRegistrations(user, studentPageQuery(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertNoQuery(request);
    const user = await requireStudent(request);
    const input = registrationInputSchema.parse(await readJson(request));
    return success("Courses registered successfully.", await registerCourses(user, input));
  } catch (error) {
    return errorResponse(error);
  }
}
