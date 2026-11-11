import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, success } from "@/server/http";
import { lecturerPageQuery, requireLecturer } from "@/server/lecturer/request";
import { getLecturerOfferings } from "@/server/lecturer/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { const user = await requireLecturer(request); return success("Assigned offerings loaded.", await getLecturerOfferings(user, lecturerPageQuery(request))); }
  catch (error) { return errorResponse(error); }
}
