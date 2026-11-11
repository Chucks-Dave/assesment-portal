import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireStudent } from "@/server/student/request";
import { getDashboard } from "@/server/student/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertNoQuery(request);
    return success("Student dashboard loaded.", await getDashboard(await requireStudent(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
