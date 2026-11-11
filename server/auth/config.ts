import "server-only";

import { z } from "zod";

const originSchema = z.url().pipe(z.string().refine((value): boolean => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) &&
    !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash &&
    (process.env.NODE_ENV !== "production" || url.protocol === "https:");
}));

export function getAuthOrigin(): URL {
  const result = originSchema.safeParse(process.env.AUTH_ORIGIN);
  if (!result.success) {
    throw new TypeError("AUTH_ORIGIN must be a valid application origin (HTTPS in production).");
  }
  return new URL(result.data);
}

export function sessionCookieOptions(): {
  name: string; httpOnly: true; secure: boolean; sameSite: "lax"; path: string;
} {
  const secure = getAuthOrigin().protocol === "https:";
  return {
    name: secure ? "__Host-uemp_session" : "uemp_session",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  };
}
