import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/request";
import { offeringUpdateSchema } from "@/server/admin/schema";
import { updateOffering } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const user = await requireAdmin(request);
    const { id } = await context.params;
    return success("Course offering updated.", await updateOffering(user, id, offeringUpdateSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
