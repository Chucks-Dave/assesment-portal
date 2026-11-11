import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireLecturer } from "@/server/lecturer/request";
import { getOfferingRoster } from "@/server/lecturer/service";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try { assertNoQuery(request); const user = await requireLecturer(request); const { id } = await context.params;
    return success("Offering roster loaded.", await getOfferingRoster(user, id)); }
  catch (error) { return errorResponse(error); }
}
