import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { NextRequest, type NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole, UserStatus } from "../generated/prisma/client";
import { hashPassword } from "../server/auth/password";

let database: PGlite;
let socket: PGLiteSocketServer;
let prisma: typeof import("../server/db").prisma;
let loginPost: typeof import("../app/api/auth/login/route").POST;
let meGet: typeof import("../app/api/auth/me/route").GET;
let logoutPost: typeof import("../app/api/auth/logout/route").POST;
let logoutAllPost: typeof import("../app/api/auth/logout-all/route").POST;
let requireUser: typeof import("../server/auth/service").requireUser;
const password = "Fictional demo passphrase 2026!";
const origin = "http://localhost:3000";
const runNode = promisify(execFile);

beforeAll(async (): Promise<void> => {
  database = await PGlite.create();
  await database.exec(await readFile(new URL("../prisma/migrations/20261111080000_auth/migration.sql", import.meta.url), "utf8"));
  socket = new PGLiteSocketServer({ db: database, port: 0, host: "127.0.0.1", maxConnections: 20 });
  await socket.start();
  vi.stubEnv("DATABASE_URL", `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`);
  vi.stubEnv("AUTH_ORIGIN", origin);
  ({ prisma } = await import("../server/db"));
  ({ POST: loginPost } = await import("../app/api/auth/login/route"));
  ({ GET: meGet } = await import("../app/api/auth/me/route"));
  ({ POST: logoutPost } = await import("../app/api/auth/logout/route"));
  ({ POST: logoutAllPost } = await import("../app/api/auth/logout-all/route"));
  ({ requireUser } = await import("../server/auth/service"));
  const passwordHash = await hashPassword(password);
  await prisma.user.createMany({ data: [
    { id: "student-a", name: "Student A", email: "student-a@example.test", role: UserRole.STUDENT, passwordHash },
    { id: "student-b", name: "Student B", email: "student-b@example.test", role: UserRole.STUDENT, passwordHash },
    { id: "lecturer", name: "Lecturer", email: "lecturer@example.test", role: UserRole.LECTURER, passwordHash },
    { id: "admin", name: "Admin", email: "admin@example.test", role: UserRole.ADMIN, passwordHash },
  ] });
});

beforeEach(async (): Promise<void> => {
  await prisma.session.deleteMany();
  await prisma.loginThrottle.deleteMany();
  await prisma.user.updateMany({ data: { status: UserStatus.ACTIVE } });
});

afterAll(async (): Promise<void> => {
  await prisma?.$disconnect();
  await socket?.stop();
  await database?.close();
  vi.unstubAllEnvs();
});

function request(path: string, body?: object, cookie?: string): NextRequest {
  return new NextRequest(`${origin}/api/auth/${path}`, {
    method: path === "me" ? "GET" : "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function sessionCookie(response: NextResponse): string {
  const cookie = response.cookies.get("uemp_session");
  if (!cookie) throw new TypeError("Expected a session cookie.");
  return `${cookie.name}=${cookie.value}`;
}

async function signIn(id = "student-a"): Promise<NextResponse> {
  return loginPost(request("login", { email: `${id}@example.test`, password }));
}

describe("authentication endpoints with PostgreSQL", (): void => {
  it.each([
    ["student-a", UserRole.STUDENT], ["lecturer", UserRole.LECTURER], ["admin", UserRole.ADMIN],
  ])("logs in %s and returns only the safe user contract", async (id, role): Promise<void> => {
    const response = await signIn(id);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      statusCode: 200, message: "Logged in successfully.", payload: {
        expiresAt: expect.any(String),
        user: { id, name: expect.any(String), email: `${id}@example.test`, role, status: UserStatus.ACTIVE },
      },
    });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.cookies.get("uemp_session")!;
    const stored = await prisma.session.findFirstOrThrow();
    expect(stored.tokenHash).toBe(createHash("sha256").update(cookie.value).digest("hex"));
    expect(stored.tokenHash).not.toBe(cookie.value);
    const me = await meGet(request("me", undefined, sessionCookie(response)));
    expect(me.status).toBe(200);
    expect((await me.json()).payload.user.role).toBe(role);
  });

  it("uses the same invalid-credential response for unknown users and wrong passwords", async (): Promise<void> => {
    const wrong = await loginPost(request("login", { email: "student-a@example.test", password: "wrong password" }));
    const unknown = await loginPost(request("login", { email: "unknown@example.test", password }));
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
    expect(await prisma.session.count()).toBe(0);
  });

  it.each([UserStatus.SUSPENDED, UserStatus.INACTIVE])("denies %s accounts at login and on existing sessions", async (status): Promise<void> => {
    const existing = sessionCookie(await signIn());
    await prisma.user.update({ where: { id: "student-a" }, data: { status } });
    expect((await signIn()).status).toBe(403);
    expect((await meGet(request("me", undefined, existing))).status).toBe(403);
    expect(await prisma.session.count()).toBe(1);
  });

  it("rejects missing, forged, expired, and revoked sessions", async (): Promise<void> => {
    expect((await meGet(request("me"))).status).toBe(401);
    expect((await meGet(request("me", undefined, `uemp_session=${"f".repeat(64)}`))).status).toBe(401);
    const cookie = sessionCookie(await signIn());
    await prisma.session.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await meGet(request("me", undefined, cookie))).status).toBe(401);
    expect((await logoutPost(request("logout", {}, cookie))).status).toBe(200);
    expect(await prisma.session.count()).toBe(0);
    expect((await meGet(request("me", undefined, cookie))).status).toBe(401);
  });

  it("revokes a previous session on login and does not permit session fixation", async (): Promise<void> => {
    const first = sessionCookie(await signIn());
    const second = await loginPost(request("login", { email: "student-a@example.test", password }, first));
    expect(sessionCookie(second)).not.toBe(first);
    expect((await meGet(request("me", undefined, first))).status).toBe(401);
    expect((await meGet(request("me", undefined, sessionCookie(second)))).status).toBe(200);
    expect(await prisma.session.count()).toBe(1);
  });

  it("logs out all devices for only the current user", async (): Promise<void> => {
    const first = sessionCookie(await signIn());
    const second = sessionCookie(await signIn());
    const otherStudent = sessionCookie(await signIn("student-b"));
    const response = await logoutAllPost(request("logout-all", {}, first));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await meGet(request("me", undefined, first))).status).toBe(401);
    expect((await meGet(request("me", undefined, second))).status).toBe(401);
    expect((await meGet(request("me", undefined, otherStudent))).status).toBe(200);
    expect((await logoutPost(request("logout"))).status).toBe(200);
    expect((await logoutAllPost(request("logout-all"))).status).toBe(401);
  });

  it("enforces current database roles and rejects identity or role injection", async (): Promise<void> => {
    const loggedIn = await signIn();
    const token = loggedIn.cookies.get("uemp_session")!.value;
    await expect(requireUser(token, [UserRole.ADMIN])).rejects.toMatchObject({ status: 403 });
    await prisma.user.update({ where: { id: "student-a" }, data: { role: UserRole.LECTURER } });
    await expect(requireUser(token, [UserRole.LECTURER])).resolves.toMatchObject({ role: UserRole.LECTURER });
    await prisma.user.update({ where: { id: "student-a" }, data: { role: UserRole.STUDENT } });
    const injected = await loginPost(request("login", { email: "student-a@example.test", password, role: "ADMIN" }));
    expect(injected.status).toBe(422);
    const me = request("me", undefined, sessionCookie(loggedIn));
    const altered = new NextRequest(`${me.url}?userId=student-b`, { headers: me.headers });
    expect((await meGet(altered)).status).toBe(422);
  });

  it("rejects untrusted origins for login, logout, and logout-all", async (): Promise<void> => {
    const cookie = sessionCookie(await signIn());
    for (const [path, handler] of [["login", loginPost], ["logout", logoutPost], ["logout-all", logoutAllPost]] as const) {
      const body = path === "login" ? { email: "student-a@example.test", password } : {};
      const untrusted = request(path, body, cookie);
      untrusted.headers.set("Origin", "https://evil.test");
      expect((await handler(untrusted)).status).toBe(403);
      untrusted.headers.delete("Origin");
      expect((await handler(untrusted)).status).toBe(403);
    }
    expect((await meGet(request("me", undefined, cookie))).status).toBe(200);
  });

  it("atomically limits parallel login attempts and includes Retry-After", async (): Promise<void> => {
    const responses = await Promise.all(Array.from({ length: 8 }, (): Promise<NextResponse> => loginPost(request("login", {
      email: "unknown@example.test", password,
    }))));
    expect(responses.filter((response): boolean => response.status === 401)).toHaveLength(5);
    const limited = responses.filter((response): boolean => response.status === 429);
    expect(limited).toHaveLength(3);
    expect(Number(limited[0].headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await prisma.session.count()).toBe(0);
  });

  it("resets expired throttle windows and caps distinct-account attempts globally", async (): Promise<void> => {
    await prisma.loginThrottle.create({ data: { key: "global", attempts: 100, expiresAt: new Date(Date.now() + 60_000) } });
    expect((await signIn()).status).toBe(429);
    await prisma.loginThrottle.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await signIn()).status).toBe(200);
  });

  it("returns sanitized unexpected errors without leaking database details", async (): Promise<void> => {
    const logger = vi.spyOn(console, "error").mockImplementation((): void => {});
    const query = vi.spyOn(prisma.user, "findUnique").mockRejectedValueOnce(new Error("database password and stack trace"));
    try {
      const response = await signIn();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        statusCode: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", requestId: expect.any(String),
      });
      expect(JSON.stringify(logger.mock.calls)).not.toContain("database password");
    } finally {
      query.mockRestore();
      logger.mockRestore();
    }
  });

  it("provisions accounts idempotently without resetting a password or upgrading a role", async (): Promise<void> => {
    const env = {
      ...process.env, AUTH_USER_EMAIL: "provisioned@example.test", AUTH_USER_NAME: "Provisioned account",
      AUTH_USER_PASSWORD: password, AUTH_USER_ROLE: UserRole.STUDENT,
    };
    const args = ["--conditions=react-server", "--import", "tsx", "scripts/provision-user.ts"];
    await runNode(process.execPath, args, { env });
    const first = await prisma.user.findUniqueOrThrow({ where: { email: env.AUTH_USER_EMAIL } });
    await runNode(process.execPath, args, { env: { ...env, AUTH_USER_ROLE: UserRole.ADMIN, AUTH_USER_PASSWORD: "A different valid password" } });
    const second = await prisma.user.findUniqueOrThrow({ where: { email: env.AUTH_USER_EMAIL } });
    expect(second.passwordHash).toBe(first.passwordHash);
    expect(second.role).toBe(UserRole.STUDENT);
    const response = await loginPost(request("login", { email: env.AUTH_USER_EMAIL, password }));
    expect(response.status).toBe(200);
  });

  it("cleans expired records without deleting active sessions or throttle windows", async (): Promise<void> => {
    await signIn();
    await prisma.session.create({ data: { userId: "student-a", tokenHash: "expired-token-digest", expiresAt: new Date(0) } });
    await prisma.loginThrottle.create({ data: { key: "expired-counter", attempts: 1, expiresAt: new Date(0) } });
    await runNode(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/cleanup-auth.ts"], { env: process.env });
    expect(await prisma.session.count()).toBe(1);
    expect(await prisma.loginThrottle.findUnique({ where: { key: "expired-counter" } })).toBeNull();
    expect(await prisma.loginThrottle.findUnique({ where: { key: "global" } })).not.toBeNull();
  });
});
