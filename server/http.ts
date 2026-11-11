import "server-only";

import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function success<T>(message: string, payload: T): NextResponse {
  return NextResponse.json({ statusCode: 200, message, payload }, {
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
}

export function errorResponse(error: unknown): NextResponse {
  // Preserve Next.js redirects and prerender bailouts before translating application failures.
  unstable_rethrow(error);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error instanceof HttpError) {
    if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter);
    return NextResponse.json({ statusCode: error.status, code: error.code, message: error.message }, {
      status: error.status, headers,
    });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ statusCode: 422, code: "VALIDATION_ERROR", message: "Invalid request fields." }, {
      status: 422, headers,
    });
  }
  const requestId = randomUUID();
  // Correlate failures without logging credentials, request bodies, or database details.
  console.error("Request failed", { requestId, errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ statusCode: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", requestId }, {
    status: 500, headers,
  });
}
