import { NextRequest, NextResponse } from "next/server";
import { logoutAll } from "@/server/auth/service";
import { emptyBodySchema } from "@/server/auth/schema";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { sessionCookieOptions } from "@/server/auth/config";
import { errorResponse, success } from "@/server/http";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertNoQuery(request);
    emptyBodySchema.parse(await readJson(request, true));
    const cookie = sessionCookieOptions();
    await logoutAll(request.cookies.get(cookie.name)?.value);
    const response = success("All sessions have been revoked.", null);
    response.cookies.set({ ...cookie, value: "", maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
