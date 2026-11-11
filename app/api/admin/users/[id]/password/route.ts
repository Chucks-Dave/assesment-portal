import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { adminUserPasswordSchema } from "@/server/admin/schema";
import { resetUserPassword } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/users/[id]/password">): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const actor = await requireAdmin(request); const { id } = await context.params;
    return success("User password reset and sessions revoked.", await resetUserPassword(actor, id, adminUserPasswordSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
