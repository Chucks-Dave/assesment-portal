import { config } from "dotenv";
import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

it("returns 401 rather than 500 for a signed-out request with local configuration", async (): Promise<void> => {
  const { parsed } = config({ quiet: true });
  vi.stubEnv("AUTH_ORIGIN", parsed?.AUTH_ORIGIN ?? "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:1/postgres");
  try {
    const { GET } = await import("../app/api/auth/me/route");
    const response = await GET(new NextRequest("http://localhost:3000/api/auth/me"));
    expect(response.status).toBe(401);
  } finally { vi.unstubAllEnvs(); }
});
