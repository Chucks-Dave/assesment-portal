import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireLecturer } from "@/server/lecturer/request";
import { submitResults } from "@/server/lecturer/service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertSameOrigin(request); assertNoQuery(request); await readJson(request, true); const user = await requireLecturer(request); const { id } = await context.params;
    return success("Results submitted for approval.", await submitResults(user, id)); }
  catch (error) { return errorResponse(error); }
}
