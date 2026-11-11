import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { NextRequest, type NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultBatchStatus, SemesterTerm, UserRole } from "../generated/prisma/client";

let database: PGlite; let socket: PGLiteSocketServer; let prisma: typeof import("../server/db").prisma;
let dashboardGet: typeof import("../app/api/admin/dashboard/route").GET;
let coursePost: typeof import("../app/api/admin/courses/route").POST;
let offeringPost: typeof import("../app/api/admin/offerings/route").POST;
let offeringPatch: typeof import("../app/api/admin/offerings/[id]/route").PATCH;
let batchesGet: typeof import("../app/api/admin/result-batches/route").GET;
let batchGet: typeof import("../app/api/admin/result-batches/[id]/route").GET;
let batchApprove: typeof import("../app/api/admin/result-batches/[id]/approve/route").POST;
let batchReject: typeof import("../app/api/admin/result-batches/[id]/reject/route").POST;
const origin = "http://localhost:3000"; const adminToken = "c".repeat(64); const studentToken = "d".repeat(64);

function request(path: string, token: string, method = "GET", body?: object): NextRequest {
  return new NextRequest(`${origin}/api/admin/${path}`, { method, headers: { Cookie: `uemp_session=${token}`, Origin: origin, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
async function payload(response: NextResponse) { return (await response.json()).payload; }

beforeAll(async (): Promise<void> => {
  database = await PGlite.create();
  for (const migration of ["20261111080000_auth", "20261111100000_student_academics", "20261111140000_course_default_units"]) await database.exec(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), "utf8"));
  socket = new PGLiteSocketServer({ db: database, port: 0, host: "127.0.0.1", maxConnections: 20 }); await socket.start();
  vi.stubEnv("DATABASE_URL", `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`); vi.stubEnv("AUTH_ORIGIN", origin);
  ({ prisma } = await import("../server/db")); ({ GET: dashboardGet } = await import("../app/api/admin/dashboard/route")); ({ POST: coursePost } = await import("../app/api/admin/courses/route")); ({ POST: offeringPost } = await import("../app/api/admin/offerings/route")); ({ PATCH: offeringPatch } = await import("../app/api/admin/offerings/[id]/route"));
  ({ GET: batchesGet } = await import("../app/api/admin/result-batches/route")); ({ GET: batchGet } = await import("../app/api/admin/result-batches/[id]/route")); ({ POST: batchApprove } = await import("../app/api/admin/result-batches/[id]/approve/route")); ({ POST: batchReject } = await import("../app/api/admin/result-batches/[id]/reject/route"));
  await prisma.user.createMany({ data: [{ id: "admin", email: "admin@test.dev", name: "Admin", passwordHash: "unused", role: UserRole.ADMIN }, { id: "student-user", email: "student@test.dev", name: "Student", passwordHash: "unused", role: UserRole.STUDENT }, { id: "lecturer-user", email: "lecturer@test.dev", name: "Lecturer", passwordHash: "unused", role: UserRole.LECTURER }] });
  await prisma.faculty.create({ data: { id: "faculty", code: "SCI", name: "Science" } });
  await prisma.department.createMany({ data: [{ id: "cs", facultyId: "faculty", code: "CSC", name: "Computer Science" }, { id: "math", facultyId: "faculty", code: "MTH", name: "Mathematics" }] });
  await prisma.program.createMany({ data: [{ id: "cs-program", departmentId: "cs", code: "CSC", name: "Computer Science" }, { id: "math-program", departmentId: "math", code: "MTH", name: "Mathematics" }] });
  await prisma.lecturer.create({ data: { id: "lecturer", userId: "lecturer-user", departmentId: "cs" } });
  await prisma.student.create({ data: { id: "student", userId: "student-user", programId: "cs-program", matricNumber: "UEMP/001", level: 200 } });
  await prisma.academicSession.create({ data: { id: "session", name: "2026/2027", startsAt: new Date("2026-09-01"), endsAt: new Date("2027-07-01") } });
  await prisma.semester.create({ data: { id: "semester", sessionId: "session", term: SemesterTerm.FIRST, startsAt: new Date("2026-09-01"), endsAt: new Date("2027-01-31"), isActive: true, registrationOpen: true } });
});

beforeEach(async (): Promise<void> => {
  await prisma.result.deleteMany(); await prisma.resultBatch.deleteMany(); await prisma.registration.deleteMany(); await prisma.auditEvent.deleteMany(); await prisma.courseOffering.deleteMany(); await prisma.course.deleteMany(); await prisma.session.deleteMany();
  await prisma.session.createMany({ data: [{ userId: "admin", tokenHash: createHash("sha256").update(adminToken).digest("hex"), expiresAt: new Date("2099-01-01") }, { userId: "student-user", tokenHash: createHash("sha256").update(studentToken).digest("hex"), expiresAt: new Date("2099-01-01") }] });
});
afterAll(async (): Promise<void> => { await prisma?.$disconnect(); await socket?.stop(); await database?.close(); vi.unstubAllEnvs(); });

describe("admin academic endpoints", (): void => {
  it("requires an administrator session", async (): Promise<void> => {
    expect((await dashboardGet(request("dashboard", studentToken))).status).toBe(403);
    expect((await dashboardGet(request("dashboard", "invalid"))).status).toBe(401);
  });
  it("creates unique catalogue courses and records the change", async (): Promise<void> => {
    const input = { departmentId: "cs", code: "csc201", title: "Data Structures", defaultCreditUnits: 3 };
    const created = await coursePost(request("courses", adminToken, "POST", input));
    expect(created.status).toBe(200); expect(await payload(created)).toMatchObject({ code: "CSC201", defaultCreditUnits: 3, department: { id: "cs" } });
    expect(await prisma.auditEvent.count({ where: { action: "COURSE_CREATED" } })).toBe(1);
    expect((await coursePost(request("courses", adminToken, "POST", input))).status).toBe(409);
    expect((await coursePost(request("courses", adminToken, "POST", { ...input, unexpected: true }))).status).toBe(422);
  });
  it("publishes only department-compatible offerings and permits safe edits", async (): Promise<void> => {
    await prisma.course.create({ data: { id: "course", departmentId: "cs", code: "CSC201", title: "Data Structures" } });
    const base = { courseId: "course", semesterId: "semester", programId: "cs-program", lecturerId: "lecturer", level: 200, creditUnits: 3 };
    const created = await offeringPost(request("offerings", adminToken, "POST", base)); const offering = await payload(created);
    expect(created.status).toBe(200); expect(offering).toMatchObject({ level: 200, creditUnits: 3 });
    expect((await offeringPost(request("offerings", adminToken, "POST", { ...base, programId: "math-program" }))).status).toBe(422);
    const patched = await offeringPatch(request(`offerings/${offering.id}`, adminToken, "PATCH", { creditUnits: 4 }), { params: Promise.resolve({ id: offering.id }) });
    expect(patched.status).toBe(200); expect(await payload(patched)).toMatchObject({ creditUnits: 4 });
    expect(await prisma.auditEvent.count()).toBe(2);
  });
  it("rejects or approves submitted result batches exactly once", async (): Promise<void> => {
    await prisma.course.create({ data: { id: "result-course", departmentId: "cs", code: "CSC301", title: "Algorithms" } });
    await prisma.courseOffering.create({ data: { id: "result-offering", courseId: "result-course", semesterId: "semester", programId: "cs-program", lecturerId: "lecturer", level: 200, creditUnits: 3 } });
    await prisma.registration.create({ data: { id: "result-registration", studentId: "student", offeringId: "result-offering", creditUnitsSnapshot: 3 } });
    await prisma.resultBatch.create({ data: { id: "submitted-batch", offeringId: "result-offering", submitterId: "lecturer-user", status: ResultBatchStatus.SUBMITTED, submittedAt: new Date() } });
    await prisma.result.create({ data: { id: "result", registrationId: "result-registration", batchId: "submitted-batch", caScore: 24, examScore: 51, totalScore: 75, grade: "A", gradePoint: 5 } });
    expect((await payload(await batchesGet(request("result-batches", adminToken)))).items).toHaveLength(1);
    expect(await payload(await batchGet(request("result-batches/submitted-batch", adminToken), { params: Promise.resolve({ id: "submitted-batch" }) }))).toMatchObject({ results: [{ totalScore: 75, grade: "A" }] });
    expect((await batchReject(request("result-batches/submitted-batch/reject", adminToken, "POST", { feedback: "Too short" }), { params: Promise.resolve({ id: "submitted-batch" }) })).status).toBe(422);
    expect((await batchReject(request("result-batches/submitted-batch/reject", adminToken, "POST", { feedback: "Please verify the examination score." }), { params: Promise.resolve({ id: "submitted-batch" }) })).status).toBe(200);
    await prisma.resultBatch.update({ where: { id: "submitted-batch" }, data: { status: ResultBatchStatus.SUBMITTED } });
    expect((await batchApprove(request("result-batches/submitted-batch/approve", adminToken, "POST", {}), { params: Promise.resolve({ id: "submitted-batch" }) })).status).toBe(200);
    expect((await batchApprove(request("result-batches/submitted-batch/approve", adminToken, "POST", {}), { params: Promise.resolve({ id: "submitted-batch" }) })).status).toBe(409);
    expect(await prisma.auditEvent.count()).toBe(2);
  });
});
