import "dotenv/config";

import { config } from "dotenv";
import { z } from "zod";
import {
  ResultBatchStatus,
  SemesterTerm,
  UserRole,
  type Prisma,
} from "../generated/prisma/client";
import { prisma } from "../server/db";

config({ path: ".env.demo-accounts", override: false, quiet: true });

const seedEnvironmentSchema = z.object({
  STUDENT_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  LECTURER_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
});

const courses = [
  { id: "demo-course-csc201", code: "CSC201", title: "Data Structures and Algorithms", defaultCreditUnits: 3 },
  { id: "demo-course-csc203", code: "CSC203", title: "Database Systems", defaultCreditUnits: 3 },
  { id: "demo-course-csc205", code: "CSC205", title: "Computer Architecture", defaultCreditUnits: 3 },
  { id: "demo-course-mth201", code: "MTH201", title: "Discrete Mathematics", defaultCreditUnits: 3 },
  { id: "demo-course-gst201", code: "GST201", title: "Communication in English II", defaultCreditUnits: 2 },
  { id: "demo-course-csc101", code: "CSC101", title: "Introduction to Computing", defaultCreditUnits: 3 },
  { id: "demo-course-mth101", code: "MTH101", title: "Elementary Mathematics", defaultCreditUnits: 3 },
  { id: "demo-course-gst101", code: "GST101", title: "Communication in English I", defaultCreditUnits: 2 },
] as const;
const SEED_TRANSACTION_TIMEOUT_MS = 30_000;

type SeedUsers = { studentId: string; lecturerId: string; adminId: string };
type AcademicContext = {
  departmentId: string;
  programId: string;
  studentId: string;
  lecturerId: string;
  activeSemesterId: string;
  historicalSemesterId: string;
};

async function requireSeedUsers(): Promise<SeedUsers> {
  const environment = seedEnvironmentSchema.parse(process.env);
  const users = await prisma.user.findMany({
    where: { email: { in: [environment.STUDENT_EMAIL, environment.LECTURER_EMAIL, environment.ADMIN_EMAIL] } },
    select: { id: true, email: true, role: true },
  });
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const student = byEmail.get(environment.STUDENT_EMAIL);
  const lecturer = byEmail.get(environment.LECTURER_EMAIL);
  const admin = byEmail.get(environment.ADMIN_EMAIL);
  if (student?.role !== UserRole.STUDENT || lecturer?.role !== UserRole.LECTURER || admin?.role !== UserRole.ADMIN) {
    throw new TypeError("The configured demo student, lecturer, and administrator accounts must already exist with matching roles.");
  }
  return { studentId: student.id, lecturerId: lecturer.id, adminId: admin.id };
}

async function upsertAcademicContext(tx: Prisma.TransactionClient, users: SeedUsers): Promise<AcademicContext> {
  const faculty = await tx.faculty.upsert({ where: { code: "SCI" },
    update: { name: "Faculty of Science" }, create: { id: "demo-faculty-science", code: "SCI", name: "Faculty of Science" } });
  const department = await tx.department.upsert({ where: { facultyId_code: { facultyId: faculty.id, code: "CSC" } },
    update: { name: "Computer Science" }, create: { id: "demo-department-csc", facultyId: faculty.id, code: "CSC", name: "Computer Science" } });
  const program = await tx.program.upsert({ where: { departmentId_code: { departmentId: department.id, code: "BSC-CS" } },
    update: { name: "B.Sc. Computer Science" }, create: { id: "demo-program-bsc-cs", departmentId: department.id, code: "BSC-CS", name: "B.Sc. Computer Science" } });
  const student = await tx.student.upsert({ where: { userId: users.studentId },
    update: { programId: program.id, matricNumber: "UEMP/CSC/2026/001", level: 200 },
    create: { id: "demo-student-okechukwu", userId: users.studentId, programId: program.id, matricNumber: "UEMP/CSC/2026/001", level: 200 } });
  const lecturer = await tx.lecturer.upsert({ where: { userId: users.lecturerId },
    update: { departmentId: department.id }, create: { id: "demo-lecturer-csc", userId: users.lecturerId, departmentId: department.id } });
  const activeSemester = await findOrCreateActiveSemester(tx);
  const historicalSemester = await upsertHistoricalSemester(tx);
  return { departmentId: department.id, programId: program.id, studentId: student.id,
    lecturerId: lecturer.id, activeSemesterId: activeSemester.id, historicalSemesterId: historicalSemester.id };
}

async function findOrCreateActiveSemester(tx: Prisma.TransactionClient): Promise<{ id: string }> {
  const existing = await tx.semester.findFirst({ where: { isActive: true }, select: { id: true } });
  if (existing) return existing;
  const session = await tx.academicSession.upsert({ where: { name: "2026/2027" }, update: {},
    create: { id: "demo-session-2026", name: "2026/2027", startsAt: new Date("2026-09-01"), endsAt: new Date("2027-07-31") } });
  return tx.semester.upsert({ where: { sessionId_term: { sessionId: session.id, term: SemesterTerm.FIRST } },
    update: { isActive: true, registrationOpen: true }, create: { id: "demo-semester-2026-first", sessionId: session.id,
      term: SemesterTerm.FIRST, startsAt: new Date("2026-09-01"), endsAt: new Date("2027-01-31"), isActive: true, registrationOpen: true },
    select: { id: true } });
}

async function upsertHistoricalSemester(tx: Prisma.TransactionClient): Promise<{ id: string }> {
  const session = await tx.academicSession.upsert({ where: { name: "2025/2026" }, update: {},
    create: { id: "demo-session-2025", name: "2025/2026", startsAt: new Date("2025-09-01"), endsAt: new Date("2026-07-31") } });
  return tx.semester.upsert({ where: { sessionId_term: { sessionId: session.id, term: SemesterTerm.SECOND } },
    update: {}, create: { id: "demo-semester-2025-second", sessionId: session.id, term: SemesterTerm.SECOND,
      startsAt: new Date("2026-02-01"), endsAt: new Date("2026-07-31"), isActive: false, registrationOpen: false },
    select: { id: true } });
}

async function seedCoursesAndRegistrations(tx: Prisma.TransactionClient, context: AcademicContext): Promise<Map<string, string>> {
  await tx.course.createMany({ data: courses.map((course) => ({ ...course, departmentId: context.departmentId })), skipDuplicates: true });
  const storedCourses = await tx.course.findMany({ where: { departmentId: context.departmentId,
    code: { in: courses.map((course) => course.code) } }, select: { id: true, code: true } });
  const courseIds = new Map(storedCourses.map((course) => [course.code, course.id]));
  const current = [["CSC201", 3], ["CSC203", 3], ["CSC205", 3], ["MTH201", 3], ["GST201", 2]] as const;
  const historical = [["CSC101", 3], ["MTH101", 3], ["GST101", 2]] as const;
  await tx.courseOffering.createMany({ data: [
    ...current.map(([code, creditUnits]) => ({ id: `demo-offering-current-${code.toLowerCase()}`, courseId: courseIds.get(code)!,
      semesterId: context.activeSemesterId, programId: context.programId, lecturerId: context.lecturerId, level: 200, creditUnits })),
    ...historical.map(([code, creditUnits]) => ({ id: `demo-offering-history-${code.toLowerCase()}`, courseId: courseIds.get(code)!,
      semesterId: context.historicalSemesterId, programId: context.programId, lecturerId: context.lecturerId, level: 100, creditUnits })),
  ], skipDuplicates: true });
  const offerings = await tx.courseOffering.findMany({ where: { programId: context.programId,
    id: { startsWith: "demo-offering-" } }, select: { id: true, creditUnits: true, course: { select: { code: true } } } });
  await tx.registration.createMany({ data: offerings.map((offering) => ({ id: `demo-registration-${offering.course.code.toLowerCase()}`,
    studentId: context.studentId, offeringId: offering.id, creditUnitsSnapshot: offering.creditUnits })), skipDuplicates: true });
  return new Map(offerings.map((offering) => [offering.course.code, offering.id]));
}

async function seedApprovedResults(tx: Prisma.TransactionClient, context: AcademicContext, users: SeedUsers,
  offeringIds: Map<string, string>): Promise<void> {
  const resultRows = [
    { code: "CSC101", caScore: 24, examScore: 52, totalScore: 76, grade: "A", gradePoint: 5 },
    { code: "MTH101", caScore: 22, examScore: 43, totalScore: 65, grade: "B", gradePoint: 4 },
    { code: "GST101", caScore: 18, examScore: 35, totalScore: 53, grade: "C", gradePoint: 3 },
  ] as const;
  const registrations = await tx.registration.findMany({ where: { studentId: context.studentId,
    offering: { semesterId: context.historicalSemesterId } }, select: { id: true, offeringId: true } });
  const registrationByOffering = new Map(registrations.map((registration) => [registration.offeringId, registration.id]));
  await tx.resultBatch.createMany({ data: resultRows.map((result) => ({ id: `demo-batch-${result.code.toLowerCase()}`,
    offeringId: offeringIds.get(result.code)!, status: ResultBatchStatus.APPROVED, submitterId: users.lecturerId,
    reviewerId: users.adminId, submittedAt: new Date("2026-08-02"), reviewedAt: new Date("2026-08-05") })), skipDuplicates: true });
  await tx.result.createMany({ data: resultRows.map((result) => ({ id: `demo-result-${result.code.toLowerCase()}`,
    registrationId: registrationByOffering.get(offeringIds.get(result.code)!)!, batchId: `demo-batch-${result.code.toLowerCase()}`,
    caScore: result.caScore, examScore: result.examScore, totalScore: result.totalScore,
    grade: result.grade, gradePoint: result.gradePoint })), skipDuplicates: true });
}

async function main(): Promise<void> {
  const users = await requireSeedUsers();
  await prisma.$transaction(async (tx): Promise<void> => {
    const context = await upsertAcademicContext(tx, users);
    const offerings = await seedCoursesAndRegistrations(tx, context);
    await seedApprovedResults(tx, context, users, offerings);
    await tx.auditEvent.upsert({ where: { id: "demo-audit-profile-created" }, update: {}, create: {
      id: "demo-audit-profile-created", actorId: users.adminId, action: "DEMO_STUDENT_PROFILE_SEEDED",
      entityType: "Student", entityId: context.studentId, changes: { source: "academic-demo-seed" },
    } });
  }, { timeout: SEED_TRANSACTION_TIMEOUT_MS });
  const profile = await prisma.student.findUniqueOrThrow({ where: { userId: users.studentId }, select: {
    registrations: { select: { offering: { select: { semester: { select: { isActive: true } } } },
      result: { select: { batch: { select: { status: true } } } } } },
  } });
  const currentRegistrations = profile.registrations.filter((registration) => registration.offering.semester.isActive).length;
  const approvedResults = profile.registrations.filter((registration) => registration.result?.batch.status === ResultBatchStatus.APPROVED).length;
  console.info("Academic demo data seeded.", { currentRegistrations, approvedResults, credentialsChanged: false });
}

main().catch((error: unknown): void => {
  const details = error as { name?: string; code?: string };
  console.error("Academic demo seeding failed.", { errorType: details.name ?? "UnknownError", code: details.code ?? "UNKNOWN" });
  process.exitCode = 1;
}).finally(async (): Promise<void> => {
  await prisma.$disconnect();
});
