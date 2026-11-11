import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireLecturer } from "@/server/lecturer/request";
import { resultEntrySchema } from "@/server/lecturer/schema";
import { saveDraftResults } from "@/server/lecturer/service";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertSameOrigin(request); assertNoQuery(request); const user = await requireLecturer(request); const { id } = await context.params;
    return success("Draft results saved.", await saveDraftResults(user, id, resultEntrySchema.parse(await readJson(request)))); }
  catch (error) { return errorResponse(error); }
}
