import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireStudent } from "@/server/student/request";
import { profileUpdateSchema } from "@/server/student/schema";
import { getProfile, updateProfile } from "@/server/student/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertNoQuery(request);
    return success("Student profile loaded.", await getProfile(await requireStudent(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertNoQuery(request);
    const user = await requireStudent(request);
    const input = profileUpdateSchema.parse(await readJson(request));
    return success("Student profile updated.", await updateProfile(user, input));
  } catch (error) {
    return errorResponse(error);
  }
}
