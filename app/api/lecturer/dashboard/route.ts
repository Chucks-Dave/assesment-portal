import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireLecturer } from "@/server/lecturer/request";
import { getLecturerDashboard } from "@/server/lecturer/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { assertNoQuery(request); return success("Lecturer dashboard loaded.", await getLecturerDashboard(await requireLecturer(request))); }
  catch (error) { return errorResponse(error); }
}
