import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { revokeUserSessions } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function DELETE(request: NextRequest, context: RouteContext<"/api/admin/users/[id]/sessions">): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const actor = await requireAdmin(request); const { id } = await context.params;
    return success("User sessions revoked.", await revokeUserSessions(actor, id));
  } catch (error) { return errorResponse(error); }
}
