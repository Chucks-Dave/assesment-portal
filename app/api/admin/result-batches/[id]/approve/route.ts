import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireAdmin } from "@/server/admin/request";
import { approveResultBatch } from "@/server/admin/service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertSameOrigin(request); assertNoQuery(request); await readJson(request, true); const user = await requireAdmin(request); const { id } = await context.params;
    return success("Result batch approved.", await approveResultBatch(user, id)); }
  catch (error) { return errorResponse(error); }
}
