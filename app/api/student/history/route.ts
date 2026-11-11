import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, success } from "@/server/http";
import { requireStudent, studentPageQuery } from "@/server/student/request";
import { getAcademicHistory } from "@/server/student/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireStudent(request);
    return success("Academic history loaded.", await getAcademicHistory(user, studentPageQuery(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
