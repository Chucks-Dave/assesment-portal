import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { adminUserQuery, requireAdmin } from "@/server/admin/request";
import { adminUserCreateSchema } from "@/server/admin/schema";
import { createUser, getUsers } from "@/server/admin/service";
import { errorResponse, success } from "@/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { const actor = await requireAdmin(request); return success("User accounts loaded.", { ...await getUsers(adminUserQuery(request)), currentUserId: actor.id }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request); assertNoQuery(request);
    const actor = await requireAdmin(request);
    return success("User account created.", await createUser(actor, adminUserCreateSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
