import { NextRequest, NextResponse } from "next/server";
import { login } from "@/server/auth/service";
import { loginSchema } from "@/server/auth/schema";
import { assertNoQuery, assertSameOrigin, readJson } from "@/server/auth/request";
import { sessionCookieOptions } from "@/server/auth/config";
import { errorResponse, success } from "@/server/http";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertNoQuery(request);
    const input = loginSchema.parse(await readJson(request));
    const cookie = sessionCookieOptions();
    const result = await login(input, request.cookies.get(cookie.name)?.value);
    const response = success("Logged in successfully.", {
      user: result.user, expiresAt: result.expiresAt.toISOString(),
    });
    response.cookies.set({ ...cookie, value: result.token, expires: result.expiresAt });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
