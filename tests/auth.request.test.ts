import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, readJson } from "../server/auth/request";
import { sessionCookieOptions } from "../server/auth/config";
import { errorResponse } from "../server/http";
import { notFound } from "next/navigation";

afterEach((): void => { vi.unstubAllEnvs(); });

describe("origin and cookie security", (): void => {
  it("requires the configured origin, independent of the supplied Host header", (): void => {
    vi.stubEnv("AUTH_ORIGIN", "http://localhost:3000");
    expect((): void => assertSameOrigin(new Request("http://localhost:3000", {
      headers: { Origin: "http://localhost:3000" },
    }))).not.toThrow();
    for (const origin of ["https://evil.test", "null", "http://localhost:3000.evil.test"]) {
      expect((): void => assertSameOrigin(new Request("http://evil.test", {
        headers: { Origin: origin, Host: "evil.test" },
      }))).toThrow("Origin");
    }
    expect((): void => assertSameOrigin(new Request("http://localhost:3000"))).toThrow("Origin");
  });

  it("sets a Secure host-only cookie for HTTPS and requires HTTPS in production", (): void => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ORIGIN", "https://uemp.example.test");
    expect(sessionCookieOptions()).toEqual({
      name: "__Host-uemp_session", httpOnly: true, secure: true, sameSite: "lax", path: "/",
    });
    vi.stubEnv("AUTH_ORIGIN", "http://localhost:3000");
    expect(sessionCookieOptions).toThrow("HTTPS in production");
  });
});

describe("request parsing", (): void => {
  it("preserves Next.js framework control flow rather than turning it into a 500", (): void => {
    expect.assertions(1);
    try {
      notFound();
    } catch (error) {
      expect((): void => { errorResponse(error); }).toThrow();
    }
  });

  it("handles invalid JSON and content types as client errors", async (): Promise<void> => {
    await expect(readJson(new Request("http://localhost", {
      method: "POST", body: "{", headers: { "Content-Type": "application/json" },
    }))).rejects.toMatchObject({ status: 400 });
    await expect(readJson(new Request("http://localhost", {
      method: "POST", body: "email=student", headers: { "Content-Type": "text/plain" },
    }))).rejects.toMatchObject({ status: 415 });
  });

  it("accepts a zero-byte stream when an empty JSON body is optional", async (): Promise<void> => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: new Uint8Array(),
    });

    await expect(readJson(request, true)).resolves.toEqual({});
  });

  it("limits actual body bytes without trusting Content-Length", async (): Promise<void> => {
    await expect(readJson(new Request("http://localhost", {
      method: "POST", body: "x".repeat(4097),
      headers: { "Content-Type": "application/json", "Content-Length": "1" },
    }))).rejects.toMatchObject({ status: 413 });
  });
});
