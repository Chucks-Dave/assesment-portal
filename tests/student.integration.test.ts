import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { NextRequest, type NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultBatchStatus, SemesterTerm, UserRole } from "../generated/prisma/client";

let database: PGlite;
let socket: PGLiteSocketServer;
let prisma: typeof import("../server/db").prisma;
let profileGet: typeof import("../app/api/student/profile/route").GET;
let profilePatch: typeof import("../app/api/student/profile/route").PATCH;
let coursesGet: typeof import("../app/api/student/courses/route").GET;
let registrationsPost: typeof import("../app/api/student/registrations/route").POST;
let registrationDelete: typeof import("../app/api/student/registrations/[id]/route").DELETE;
let resultsGet: typeof import("../app/api/student/results/route").GET;
let historyGet: typeof import("../app/api/student/history/route").GET;
let dashboardGet: typeof import("../app/api/student/dashboard/route").GET;
const origin = "http://localhost:3000";
const studentToken = "a".repeat(64);
const lecturerToken = "b".repeat(64);

function request(path: string, token: string, method = "GET", body?: object): NextRequest {
  return new NextRequest(`${origin}/api/student/${path}`, {
    method,
    headers: { Cookie: `uemp_session=${token}`, Origin: origin, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function payload(response: NextResponse) {
  return (await response.json()).payload;
}

beforeAll(async (): Promise<void> => {
  database = await PGlite.create();
  for (const migration of ["20261111080000_auth", "20261111100000_student_academics", "20261111140000_course_default_units"]) {
    await database.exec(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), "utf8"));
  }
  socket = new PGLiteSocketServer({ db: database, port: 0, host: "127.0.0.1", maxConnections: 20 });
  await socket.start();
  vi.stubEnv("DATABASE_URL", `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`);
  vi.stubEnv("AUTH_ORIGIN", origin);
  ({ prisma } = await import("../server/db"));
  ({ GET: profileGet, PATCH: profilePatch } = await import("../app/api/student/profile/route"));
  ({ GET: coursesGet } = await import("../app/api/student/courses/route"));
  ({ POST: registrationsPost } = await import("../app/api/student/registrations/route"));
  ({ DELETE: registrationDelete } = await import("../app/api/student/registrations/[id]/route"));
  ({ GET: resultsGet } = await import("../app/api/student/results/route"));
  ({ GET: historyGet } = await import("../app/api/student/history/route"));
  ({ GET: dashboardGet } = await import("../app/api/student/dashboard/route"));
  await seedDomain();
});

async function seedDomain(): Promise<void> {
  await prisma.user.createMany({ data: [
    { id: "user-a", email: "a@example.test", name: "Student A", passwordHash: "unused", role: UserRole.STUDENT },
    { id: "user-b", email: "b@example.test", name: "Student B", passwordHash: "unused", role: UserRole.STUDENT },
    { id: "lecturer", email: "l@example.test", name: "Lecturer", passwordHash: "unused", role: UserRole.LECTURER },
  ] });
  await prisma.faculty.create({ data: { id: "faculty", code: "SCI", name: "Science" } });
  await prisma.department.create({ data: { id: "department", facultyId: "faculty", code: "CSC", name: "Computer Science" } });
  await prisma.program.createMany({ data: [
    { id: "program-a", departmentId: "department", code: "CSC", name: "Computer Science" },
    { id: "program-b", departmentId: "department", code: "IFT", name: "Information Technology" },
  ] });
  await prisma.student.createMany({ data: [
    { id: "student-a", userId: "user-a", programId: "program-a", matricNumber: "UEMP/001", level: 200 },
    { id: "student-b", userId: "user-b", programId: "program-b", matricNumber: "UEMP/002", level: 200 },
  ] });
  await prisma.academicSession.create({ data: { id: "session", name: "2026/2027", startsAt: new Date("2026-09-01"), endsAt: new Date("2027-07-01") } });
  await prisma.semester.create({ data: { id: "semester", sessionId: "session", term: SemesterTerm.FIRST,
    startsAt: new Date("2026-09-01"), endsAt: new Date("2027-01-31"), isActive: true, registrationOpen: true } });
  await prisma.course.createMany({ data: [
    { id: "course-1", departmentId: "department", code: "CSC201", title: "Algorithms" },
    { id: "course-2", departmentId: "department", code: "CSC203", title: "Databases" },
    { id: "course-3", departmentId: "department", code: "IFT201", title: "Networks" },
  ] });
  await prisma.courseOffering.createMany({ data: [
    { id: "offering-1", courseId: "course-1", semesterId: "semester", programId: "program-a", level: 200, creditUnits: 3 },
    { id: "offering-2", courseId: "course-2", semesterId: "semester", programId: "program-a", level: 200, creditUnits: 2 },
    { id: "offering-other", courseId: "course-3", semesterId: "semester", programId: "program-b", level: 200, creditUnits: 3 },
  ] });
}

beforeEach(async (): Promise<void> => {
  await prisma.result.deleteMany();
  await prisma.resultBatch.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.session.createMany({ data: [
    { userId: "user-a", tokenHash: createHash("sha256").update(studentToken).digest("hex"), expiresAt: new Date("2099-01-01") },
    { userId: "lecturer", tokenHash: createHash("sha256").update(lecturerToken).digest("hex"), expiresAt: new Date("2099-01-01") },
  ] });
});

afterAll(async (): Promise<void> => {
  await prisma?.$disconnect();
  await socket?.stop();
  await database?.close();
  vi.unstubAllEnvs();
});

describe("student endpoints", (): void => {
  it("returns owned academic identity and only allows contact edits", async (): Promise<void> => {
    const profile = await payload(await profileGet(request("profile", studentToken)));
    expect(profile).toMatchObject({ matricNumber: "UEMP/001", level: 200, program: { code: "CSC" } });
    expect((await profilePatch(request("profile", studentToken, "PATCH", { phone: "+2348000000000" }))).status).toBe(200);
    expect(await prisma.auditEvent.count()).toBe(1);
    expect((await profilePatch(request("profile", studentToken, "PATCH", { level: 500 }))).status).toBe(422);
    expect((await profileGet(request("profile", lecturerToken))).status).toBe(403);
  });

  it("lists only active offerings matching the student's program and level", async (): Promise<void> => {
    const courses = await payload(await coursesGet(request("courses?limit=1", studentToken)));
    expect(courses.items).toHaveLength(1);
    expect(courses.items[0].course.code).toBe("CSC201");
    expect(courses.nextCursor).toBe("offering-1");
  });

  it("registers an eligible set atomically and rejects duplicates", async (): Promise<void> => {
    const mixed = await registrationsPost(request("registrations", studentToken, "POST", {
      offeringIds: ["offering-1", "offering-other"],
    }));
    expect(mixed.status).toBe(422);
    expect(await prisma.registration.count()).toBe(0);
    const valid = request("registrations", studentToken, "POST", { offeringIds: ["offering-1", "offering-2"] });
    expect((await registrationsPost(valid)).status).toBe(200);
    expect(await prisma.registration.count()).toBe(2);
    expect((await registrationsPost(request("registrations", studentToken, "POST", {
      offeringIds: ["offering-1"],
    }))).status).toBe(409);
  });

  it("withdraws only the signed-in student's registration while registration is open", async (): Promise<void> => {
    await prisma.registration.createMany({ data: [
      { id: "owned-registration", studentId: "student-a", offeringId: "offering-1", creditUnitsSnapshot: 3 },
      { id: "other-registration", studentId: "student-b", offeringId: "offering-other", creditUnitsSnapshot: 3 },
    ] });
    const missing = await registrationDelete(request("registrations/other-registration", studentToken, "DELETE"), { params: Promise.resolve({ id: "other-registration" }) });
    expect(missing.status).toBe(404);
    const withdrawn = await registrationDelete(request("registrations/owned-registration", studentToken, "DELETE"), { params: Promise.resolve({ id: "owned-registration" }) });
    expect(withdrawn.status).toBe(200);
    expect(await prisma.registration.findUnique({ where: { id: "owned-registration" } })).toBeNull();
    expect(await prisma.auditEvent.findFirst({ where: { action: "COURSE_WITHDRAWN" } })).not.toBeNull();
  });

  it("never exposes unapproved or another student's results", async (): Promise<void> => {
    const registrations = await Promise.all([
      prisma.registration.create({ data: { studentId: "student-a", offeringId: "offering-1", creditUnitsSnapshot: 3 } }),
      prisma.registration.create({ data: { studentId: "student-a", offeringId: "offering-2", creditUnitsSnapshot: 2 } }),
      prisma.registration.create({ data: { studentId: "student-b", offeringId: "offering-other", creditUnitsSnapshot: 3 } }),
    ]);
    const batches = await Promise.all([
      prisma.resultBatch.create({ data: { id: "approved", offeringId: "offering-1", submitterId: "lecturer", status: ResultBatchStatus.APPROVED } }),
      prisma.resultBatch.create({ data: { id: "draft", offeringId: "offering-2", submitterId: "lecturer", status: ResultBatchStatus.DRAFT } }),
      prisma.resultBatch.create({ data: { id: "other", offeringId: "offering-other", submitterId: "lecturer", status: ResultBatchStatus.APPROVED } }),
    ]);
    await prisma.result.createMany({ data: [
      { registrationId: registrations[0].id, batchId: batches[0].id, caScore: 25, examScore: 50, totalScore: 75, grade: "A", gradePoint: 5 },
      { registrationId: registrations[1].id, batchId: batches[1].id, caScore: 20, examScore: 40, totalScore: 60, grade: "B", gradePoint: 4 },
      { registrationId: registrations[2].id, batchId: batches[2].id, caScore: 30, examScore: 60, totalScore: 90, grade: "A", gradePoint: 5 },
    ] });
    const results = await payload(await resultsGet(request("results", studentToken)));
    expect(results.items).toHaveLength(1);
    expect(results.items[0].registration.offering.course.code).toBe("CSC201");
    expect(results.summary).toEqual({ attemptedUnits: 3, gradePoints: 15, gpa: 5 });
    const history = await payload(await historyGet(request("history", studentToken)));
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({ semester: { id: "semester" }, grades: [{ id: results.items[0].id }],
      summary: { attemptedUnits: 3, gradePoints: 15, gpa: 5 } });
    expect(history.cumulative).toEqual(results.summary);
  });

  it("builds the dashboard summary from the active semester and approved results", async (): Promise<void> => {
    await prisma.registration.create({ data: { studentId: "student-a", offeringId: "offering-1", creditUnitsSnapshot: 3 } });
    const dashboard = await payload(await dashboardGet(request("dashboard", studentToken)));
    expect(dashboard).toMatchObject({ registeredUnits: 3, activeSemester: { id: "semester" },
      academicSummary: { attemptedUnits: 0, gpa: null } });
  });
});
