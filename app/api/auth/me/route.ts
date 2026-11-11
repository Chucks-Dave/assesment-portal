import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/service";
import { sessionCookieOptions } from "@/server/auth/config";
import { assertNoQuery } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertNoQuery(request);
    const user = await requireUser(request.cookies.get(sessionCookieOptions().name)?.value);
    return success("Current user retrieved.", { user });
  } catch (error) {
    return errorResponse(error);
  }
}
