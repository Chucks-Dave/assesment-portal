import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { adminUserStatusSchema } from "@/server/admin/schema";
import { updateUserStatus } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/users/[id]">): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const actor = await requireAdmin(request); const { id } = await context.params;
    return success("User account status updated.", await updateUserStatus(actor, id, adminUserStatusSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
