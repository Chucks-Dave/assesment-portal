import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireAdmin } from "@/server/admin/request";
import { getResultBatch } from "@/server/admin/service";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertNoQuery(request); await requireAdmin(request); const { id } = await context.params;
    return success("Result batch loaded.", await getResultBatch(id)); }
  catch (error) { return errorResponse(error); }
}
