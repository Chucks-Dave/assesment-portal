import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, success } from "@/server/http";
import { requireAdmin, resultBatchQuery } from "@/server/admin/request";
import { getResultBatches } from "@/server/admin/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { await requireAdmin(request); return success("Result batches loaded.", await getResultBatches(resultBatchQuery(request))); }
  catch (error) { return errorResponse(error); }
}
