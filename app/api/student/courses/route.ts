import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, success } from "@/server/http";
import { requireStudent, studentPageQuery } from "@/server/student/request";
import { getEligibleOfferings } from "@/server/student/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireStudent(request);
    return success("Eligible courses loaded.", await getEligibleOfferings(user, studentPageQuery(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
