import "server-only";

import { AUTH } from "./constants";
import { getAuthOrigin } from "./config";
import { HttpError } from "../http";

export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== getAuthOrigin().origin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "INVALID_ORIGIN", "A matching Origin header is required.");
  }
}

export function assertNoQuery(request: Request): void {
  if (new URL(request.url).search) {
    throw new HttpError(422, "INVALID_QUERY", "This endpoint does not accept query parameters.");
  }
}

export async function readJson(request: Request, allowEmpty = false): Promise<unknown> {
  if (!request.body && allowEmpty) return {};
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType && contentType !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_JSON", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > AUTH.requestMaxBytes) {
        await reader.cancel();
        throw new HttpError(413, "BODY_TOO_LARGE", "Request body is too large.");
      }
      chunks.push(value);
    }
    if (size === 0 && allowEmpty) return {};
    if (contentType !== "application/json") {
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  } finally {
    reader.releaseLock();
  }
}
