import "server-only";

import { Prisma, ResultBatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import type { AuthUser } from "@/server/auth/service";
import { calculateGpa } from "./grading";
import type { ProfileUpdate, RegistrationInput, StudentPageQuery } from "./schema";

const profileSelect = {
  id: true, matricNumber: true, level: true, phone: true, address: true,
  user: { select: { name: true, email: true } },
  program: { select: { id: true, code: true, name: true, department: {
    select: { id: true, code: true, name: true, faculty: { select: { id: true, code: true, name: true } } },
  } } },
} satisfies Prisma.StudentSelect;

async function studentFor(userId: string) {
  const student = await prisma.student.findUnique({ where: { userId }, select: profileSelect });
  if (!student) throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile was not found.");
  return student;
}

function page<T extends { id: string }>(records: T[], limit: number) {
  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getProfile(user: AuthUser) {
  return studentFor(user.id);
}

export async function updateProfile(user: AuthUser, input: ProfileUpdate) {
  const student = await studentFor(user.id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: student.id }, data: input, select: profileSelect,
    });
    await tx.auditEvent.create({ data: {
      actorId: user.id, action: "STUDENT_PROFILE_UPDATED", entityType: "Student",
      entityId: student.id, changes: input,
    } });
    return updated;
  });
}

export async function getEligibleOfferings(user: AuthUser, query: StudentPageQuery) {
  const student = await studentFor(user.id);
  const records = await prisma.courseOffering.findMany({
    where: { programId: student.program.id, level: student.level, semester: { isActive: true } },
    select: { id: true, creditUnits: true, course: { select: { code: true, title: true } },
      semester: { select: { id: true, term: true, registrationOpen: true, session: { select: { id: true, name: true } } } },
      lecturer: { select: { user: { select: { name: true } } } },
      registrations: { where: { studentId: student.id }, select: { id: true }, take: 1 },
    },
    orderBy: { id: "asc" }, cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0, take: query.limit + 1,
  });
  return page(records.map(({ registrations, ...offering }) => ({
    ...offering, registered: registrations.length > 0,
  })), query.limit);
}

const registrationSelect = {
  id: true, registeredAt: true, creditUnitsSnapshot: true,
  offering: { select: { id: true, course: { select: { code: true, title: true } },
    semester: { select: { id: true, term: true, session: { select: { id: true, name: true } } } },
  } },
} satisfies Prisma.RegistrationSelect;

export async function getRegistrations(user: AuthUser, query: StudentPageQuery) {
  const student = await studentFor(user.id);
  const records = await prisma.registration.findMany({
    where: { studentId: student.id, offering: query.semesterId ? { semesterId: query.semesterId } : undefined },
    select: registrationSelect, orderBy: { id: "asc" },
    cursor: query.cursor ? { id: query.cursor } : undefined, skip: query.cursor ? 1 : 0, take: query.limit + 1,
  });
  return page(records, query.limit);
}

export async function registerCourses(user: AuthUser, input: RegistrationInput) {
  if (new Set(input.offeringIds).size !== input.offeringIds.length) {
    throw new HttpError(422, "DUPLICATE_OFFERING", "Each course offering may appear only once.");
  }
  const student = await studentFor(user.id);
  try {
    return await prisma.$transaction(async (tx) => {
      const offerings = await tx.courseOffering.findMany({ where: {
        id: { in: input.offeringIds }, programId: student.program.id, level: student.level,
        semester: { isActive: true, registrationOpen: true },
      }, select: { id: true, creditUnits: true } });
      if (offerings.length !== input.offeringIds.length) {
        throw new HttpError(422, "INELIGIBLE_OFFERING", "One or more course offerings are not eligible for registration.");
      }
      await tx.registration.createMany({ data: offerings.map((offering) => ({
        studentId: student.id, offeringId: offering.id, creditUnitsSnapshot: offering.creditUnits,
      })) });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "COURSES_REGISTERED",
        entityType: "Student", entityId: student.id, changes: { offeringIds: input.offeringIds } } });
      return tx.registration.findMany({ where: { studentId: student.id, offeringId: { in: input.offeringIds } }, select: registrationSelect });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "ALREADY_REGISTERED", "One or more courses are already registered.");
    }
    throw error;
  }
}

export async function withdrawRegistration(user: AuthUser, registrationId: string) {
  const student = await studentFor(user.id);
  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, studentId: student.id },
    select: { id: true, offering: { select: { semester: { select: { registrationOpen: true } } } }, result: { select: { id: true } } },
  });
  if (!registration) throw new HttpError(404, "REGISTRATION_NOT_FOUND", "Course registration was not found.");
  if (!registration.offering.semester.registrationOpen) {
    throw new HttpError(409, "REGISTRATION_CLOSED", "Course registration is closed. This course can no longer be withdrawn.");
  }
  if (registration.result) throw new HttpError(409, "RESULT_EXISTS", "A course with a recorded result cannot be withdrawn.");
  return prisma.$transaction(async (tx) => {
    await tx.registration.delete({ where: { id: registration.id } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "COURSE_WITHDRAWN", entityType: "Registration", entityId: registration.id,
      changes: { registrationId: registration.id } } });
    return { id: registration.id };
  });
}

const approvedResultWhere = (studentId: string, semesterId?: string): Prisma.ResultWhereInput => ({
  registration: { studentId, offering: semesterId ? { semesterId } : undefined },
  batch: { status: ResultBatchStatus.APPROVED },
});

const resultSelect = {
  id: true, caScore: true, examScore: true, totalScore: true, grade: true, gradePoint: true,
  registration: { select: { creditUnitsSnapshot: true, offering: { select: {
    course: { select: { code: true, title: true } }, semester: { select: {
      id: true, term: true, session: { select: { id: true, name: true } },
    } },
  } } } },
} satisfies Prisma.ResultSelect;

function serializeResult(result: Prisma.ResultGetPayload<{ select: typeof resultSelect }>) {
  return { ...result, caScore: Number(result.caScore), examScore: Number(result.examScore), totalScore: Number(result.totalScore) };
}

export async function getApprovedResults(user: AuthUser, query: StudentPageQuery) {
  const student = await studentFor(user.id);
  const where = approvedResultWhere(student.id, query.semesterId);
  const [records, summaryRows] = await prisma.$transaction([
    prisma.result.findMany({ where, select: resultSelect, orderBy: { id: "asc" },
      cursor: query.cursor ? { id: query.cursor } : undefined, skip: query.cursor ? 1 : 0, take: query.limit + 1 }),
    prisma.result.findMany({ where, select: { gradePoint: true,
      registration: { select: { creditUnitsSnapshot: true } } } }),
  ]);
  const serialized = records.map(serializeResult);
  const summary = calculateGpa(summaryRows.map((result) => ({
    creditUnits: result.registration.creditUnitsSnapshot, gradePoint: result.gradePoint,
  })));
  return { ...page(serialized, query.limit), summary };
}

export async function getAcademicHistory(user: AuthUser, query: StudentPageQuery) {
  const student = await studentFor(user.id);
  const where = approvedResultWhere(student.id, query.semesterId);
  const semesters = await prisma.semester.findMany({
    where: { id: query.semesterId, offerings: { some: { registrations: { some: {
      studentId: student.id, result: { is: { batch: { status: ResultBatchStatus.APPROVED } } },
    } } } } },
    select: { id: true, term: true, session: { select: { id: true, name: true } } },
    orderBy: { startsAt: "desc" }, cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0, take: query.limit + 1,
  });
  const semesterPage = page(semesters, query.limit);
  const [records, cumulativeRows] = await prisma.$transaction([
    prisma.result.findMany({ where: { ...where, registration: { studentId: student.id,
      offering: { semesterId: { in: semesterPage.items.map((semester) => semester.id) } } } }, select: resultSelect, orderBy: { id: "asc" } }),
    prisma.result.findMany({ where, select: { gradePoint: true, registration: { select: { creditUnitsSnapshot: true } } } }),
  ]);
  const serialized = records.map(serializeResult);
  return { items: semesterPage.items.map((semester) => {
    const grades = serialized.filter((result) => result.registration.offering.semester.id === semester.id);
    return { semester, grades, summary: calculateGpa(grades.map((grade) => ({
      creditUnits: grade.registration.creditUnitsSnapshot, gradePoint: grade.gradePoint,
    }))) };
  }), nextCursor: semesterPage.nextCursor, cumulative: calculateGpa(cumulativeRows.map((result) => ({
    creditUnits: result.registration.creditUnitsSnapshot, gradePoint: result.gradePoint,
  }))) };
}

export async function getDashboard(user: AuthUser) {
  const student = await studentFor(user.id);
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true },
    select: { id: true, term: true, registrationOpen: true, session: { select: { id: true, name: true } } } });
  const registrations = activeSemester ? await prisma.registration.findMany({
    where: { studentId: student.id, offering: { semesterId: activeSemester.id } },
    select: { creditUnitsSnapshot: true },
  }) : [];
  const approved = await prisma.result.findMany({ where: approvedResultWhere(student.id),
    select: { gradePoint: true, registration: { select: { creditUnitsSnapshot: true } } } });
  return { student, activeSemester, registeredUnits: registrations.reduce((sum, item) => sum + item.creditUnitsSnapshot, 0),
    academicSummary: calculateGpa(approved.map((result) => ({ creditUnits: result.registration.creditUnitsSnapshot, gradePoint: result.gradePoint }))),
  };
}
