import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { getAdminOptions } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertNoQuery(request);
    await requireAdmin(request);
    return success("Administration options loaded.", await getAdminOptions());
  } catch (error) { return errorResponse(error); }
}
