import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireAdmin } from "@/server/admin/request";
import { resultRejectionSchema } from "@/server/admin/schema";
import { rejectResultBatch } from "@/server/admin/service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertSameOrigin(request); assertNoQuery(request); const user = await requireAdmin(request); const { id } = await context.params;
    return success("Result batch returned to lecturer.", await rejectResultBatch(user, id, resultRejectionSchema.parse(await readJson(request)))); }
  catch (error) { return errorResponse(error); }
}
