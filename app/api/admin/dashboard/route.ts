import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { getAdminDashboard } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertNoQuery(request);
    await requireAdmin(request);
    return success("Admin dashboard loaded.", await getAdminDashboard());
  } catch (error) { return errorResponse(error); }
}
