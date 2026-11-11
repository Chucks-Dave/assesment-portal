import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { NextRequest, type NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SemesterTerm, UserRole } from "../generated/prisma/client";

let database: PGlite; let socket: PGLiteSocketServer; let prisma: typeof import("../server/db").prisma;
let dashboardGet: typeof import("../app/api/lecturer/dashboard/route").GET;
let rosterGet: typeof import("../app/api/lecturer/offerings/[id]/route").GET;
let resultsPut: typeof import("../app/api/lecturer/offerings/[id]/results/route").PUT;
let submitPost: typeof import("../app/api/lecturer/offerings/[id]/submit/route").POST;
const origin = "http://localhost:3000"; const lecturerToken = "e".repeat(64); const outsiderToken = "f".repeat(64);

function request(path: string, token: string, method = "GET", body?: object): NextRequest {
  return new NextRequest(`${origin}/api/lecturer/${path}`, { method, headers: { Cookie: `uemp_session=${token}`, Origin: origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function payload(response: NextResponse) { return (await response.json()).payload; }
const context = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async (): Promise<void> => {
  database = await PGlite.create();
  for (const migration of ["20261111080000_auth", "20261111100000_student_academics", "20261111140000_course_default_units"]) await database.exec(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), "utf8"));
  socket = new PGLiteSocketServer({ db: database, port: 0, host: "127.0.0.1", maxConnections: 20 }); await socket.start();
  vi.stubEnv("DATABASE_URL", `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`); vi.stubEnv("AUTH_ORIGIN", origin);
  ({ prisma } = await import("../server/db")); ({ GET: dashboardGet } = await import("../app/api/lecturer/dashboard/route")); ({ GET: rosterGet } = await import("../app/api/lecturer/offerings/[id]/route")); ({ PUT: resultsPut } = await import("../app/api/lecturer/offerings/[id]/results/route")); ({ POST: submitPost } = await import("../app/api/lecturer/offerings/[id]/submit/route"));
  await prisma.user.createMany({ data: [
    { id: "lecturer-user", email: "lecturer@test.dev", name: "Ada Lecturer", passwordHash: "unused", role: UserRole.LECTURER },
    { id: "outsider-user", email: "other@test.dev", name: "Other Lecturer", passwordHash: "unused", role: UserRole.LECTURER },
    { id: "student-user-1", email: "s1@test.dev", name: "Student One", passwordHash: "unused", role: UserRole.STUDENT },
    { id: "student-user-2", email: "s2@test.dev", name: "Student Two", passwordHash: "unused", role: UserRole.STUDENT },
  ] });
  await prisma.faculty.create({ data: { id: "faculty", code: "SCI", name: "Science" } }); await prisma.department.create({ data: { id: "department", facultyId: "faculty", code: "CSC", name: "Computer Science" } });
  await prisma.program.create({ data: { id: "program", departmentId: "department", code: "BSC-CS", name: "Computer Science" } });
  await prisma.lecturer.createMany({ data: [{ id: "lecturer", userId: "lecturer-user", departmentId: "department" }, { id: "outsider", userId: "outsider-user", departmentId: "department" }] });
  await prisma.student.createMany({ data: [{ id: "student-1", userId: "student-user-1", programId: "program", matricNumber: "UEMP/001", level: 200 }, { id: "student-2", userId: "student-user-2", programId: "program", matricNumber: "UEMP/002", level: 200 }] });
  await prisma.academicSession.create({ data: { id: "session", name: "2026/2027", startsAt: new Date("2026-09-01"), endsAt: new Date("2027-07-01") } });
  await prisma.semester.create({ data: { id: "semester", sessionId: "session", term: SemesterTerm.FIRST, startsAt: new Date("2026-09-01"), endsAt: new Date("2027-01-31"), isActive: true, registrationOpen: true } });
  await prisma.course.create({ data: { id: "course", departmentId: "department", code: "CSC201", title: "Data Structures" } });
  await prisma.courseOffering.createMany({ data: [{ id: "assigned", courseId: "course", semesterId: "semester", programId: "program", lecturerId: "lecturer", level: 200, creditUnits: 3 }, { id: "other", courseId: "course", semesterId: "semester", programId: "program", lecturerId: "outsider", level: 300, creditUnits: 3 }] });
  await prisma.registration.createMany({ data: [{ id: "registration-1", studentId: "student-1", offeringId: "assigned", creditUnitsSnapshot: 3 }, { id: "registration-2", studentId: "student-2", offeringId: "assigned", creditUnitsSnapshot: 3 }] });
});

beforeEach(async (): Promise<void> => {
  await prisma.result.deleteMany(); await prisma.resultBatch.deleteMany(); await prisma.auditEvent.deleteMany(); await prisma.session.deleteMany();
  await prisma.session.createMany({ data: [{ userId: "lecturer-user", tokenHash: createHash("sha256").update(lecturerToken).digest("hex"), expiresAt: new Date("2099-01-01") }, { userId: "outsider-user", tokenHash: createHash("sha256").update(outsiderToken).digest("hex"), expiresAt: new Date("2099-01-01") }] });
});
afterAll(async (): Promise<void> => { await prisma?.$disconnect(); await socket?.stop(); await database?.close(); vi.unstubAllEnvs(); });

describe("lecturer result workflow", (): void => {
  it("shows only assigned active offerings and protects another roster", async (): Promise<void> => {
    const dashboard = await payload(await dashboardGet(request("dashboard", lecturerToken)));
    expect(dashboard).toMatchObject({ summary: { assignedCourses: 1, registeredStudents: 2 }, offerings: [{ id: "assigned" }] });
    expect((await rosterGet(request("offerings/other", lecturerToken), context("other"))).status).toBe(404);
  });
  it("validates score limits and registration ownership", async (): Promise<void> => {
    expect((await resultsPut(request("offerings/assigned/results", lecturerToken, "PUT", { results: [{ registrationId: "registration-1", caScore: 31, examScore: 60 }] }), context("assigned"))).status).toBe(422);
    expect((await resultsPut(request("offerings/assigned/results", lecturerToken, "PUT", { results: [{ registrationId: "missing", caScore: 20, examScore: 60 }] }), context("assigned"))).status).toBe(422);
  });
  it("saves calculated drafts, requires a complete roster, submits, and locks edits", async (): Promise<void> => {
    const one = { results: [{ registrationId: "registration-1", caScore: 25, examScore: 50 }] };
    expect((await resultsPut(request("offerings/assigned/results", lecturerToken, "PUT", one), context("assigned"))).status).toBe(200);
    expect(await prisma.result.findUnique({ where: { registrationId: "registration-1" }, select: { totalScore: true, grade: true, gradePoint: true } })).toMatchObject({ grade: "A", gradePoint: 5 });
    expect((await submitPost(request("offerings/assigned/submit", lecturerToken, "POST", {}), context("assigned"))).status).toBe(422);
    const complete = { results: [...one.results, { registrationId: "registration-2", caScore: 18, examScore: 35 }] };
    await resultsPut(request("offerings/assigned/results", lecturerToken, "PUT", complete), context("assigned"));
    expect((await submitPost(request("offerings/assigned/submit", lecturerToken, "POST", {}), context("assigned"))).status).toBe(200);
    expect((await resultsPut(request("offerings/assigned/results", lecturerToken, "PUT", complete), context("assigned"))).status).toBe(409);
    expect(await prisma.auditEvent.count()).toBe(3);
  });
});
