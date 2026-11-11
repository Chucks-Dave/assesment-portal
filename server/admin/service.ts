import "server-only";

import { Prisma, ResultBatchStatus } from "@/generated/prisma/client";
import type { AuthUser } from "@/server/auth/service";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import type { AdminPageQuery, CourseCreate, OfferingCreate, OfferingUpdate, ResultBatchQuery, ResultRejection } from "./schema";

const courseSelect = { id: true, code: true, title: true, defaultCreditUnits: true,
  department: { select: { id: true, code: true, name: true } },
} satisfies Prisma.CourseSelect;

const offeringSelect = { id: true, level: true, creditUnits: true,
  course: { select: { id: true, code: true, title: true } },
  semester: { select: { id: true, term: true, isActive: true, registrationOpen: true,
    session: { select: { id: true, name: true } } } },
  program: { select: { id: true, code: true, name: true } },
  lecturer: { select: { id: true, user: { select: { name: true } } } },
  _count: { select: { registrations: true } },
} satisfies Prisma.CourseOfferingSelect;

function page<T extends { id: string }>(records: T[], limit: number) {
  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getAdminDashboard() {
  const [courseCount, offeringCount, studentCount, lecturerCount, activeSemester, recentOfferings] = await prisma.$transaction([
    prisma.course.count(), prisma.courseOffering.count(), prisma.student.count(), prisma.lecturer.count(),
    prisma.semester.findFirst({ where: { isActive: true }, select: { id: true, term: true, registrationOpen: true,
      session: { select: { id: true, name: true } } } }),
    prisma.courseOffering.findMany({ select: offeringSelect, orderBy: { id: "desc" }, take: 6 }),
  ]);
  return { counts: { courses: courseCount, offerings: offeringCount, students: studentCount, lecturers: lecturerCount }, activeSemester, recentOfferings };
}

export async function getAdminOptions() {
  const [departments, programs, semesters, lecturers, courses] = await prisma.$transaction([
    prisma.department.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" }, take: 100 }),
    prisma.program.findMany({ select: { id: true, departmentId: true, code: true, name: true }, orderBy: { code: "asc" }, take: 100 }),
    prisma.semester.findMany({ select: { id: true, term: true, isActive: true, session: { select: { name: true } } }, orderBy: { startsAt: "desc" }, take: 20 }),
    prisma.lecturer.findMany({ select: { id: true, departmentId: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } }, take: 100 }),
    prisma.course.findMany({ select: courseSelect, orderBy: { code: "asc" }, take: 100 }),
  ]);
  return { departments, programs, semesters, lecturers, courses };
}

export async function getCourses(query: AdminPageQuery) {
  const records = await prisma.course.findMany({ where: { departmentId: query.departmentId }, select: courseSelect,
    orderBy: { id: "asc" }, cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0, take: query.limit + 1 });
  return page(records, query.limit);
}

export async function createCourse(user: AuthUser, input: CourseCreate) {
  const department = await prisma.department.findUnique({ where: { id: input.departmentId }, select: { id: true } });
  if (!department) throw new HttpError(422, "INVALID_DEPARTMENT", "The selected department does not exist.");
  try {
    return await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({ data: input, select: courseSelect });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "COURSE_CREATED", entityType: "Course", entityId: course.id, changes: input } });
      return course;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "COURSE_EXISTS", "A course with this code already exists in the department.");
    }
    throw error;
  }
}

async function validateOffering(input: OfferingCreate | { courseId: string; programId: string; lecturerId?: string | null }) {
  const [course, program, lecturer] = await Promise.all([
    prisma.course.findUnique({ where: { id: input.courseId }, select: { departmentId: true } }),
    prisma.program.findUnique({ where: { id: input.programId }, select: { departmentId: true } }),
    input.lecturerId ? prisma.lecturer.findUnique({ where: { id: input.lecturerId }, select: { departmentId: true } }) : null,
  ]);
  if (!course || !program) throw new HttpError(422, "INVALID_OFFERING_CONTEXT", "The selected course or programme does not exist.");
  if (course.departmentId !== program.departmentId) throw new HttpError(422, "DEPARTMENT_MISMATCH", "Course and programme must belong to the same department.");
  if (input.lecturerId && (!lecturer || lecturer.departmentId !== course.departmentId)) {
    throw new HttpError(422, "LECTURER_MISMATCH", "The lecturer must belong to the course department.");
  }
}

export async function getOfferings(query: AdminPageQuery) {
  const records = await prisma.courseOffering.findMany({ where: { semesterId: query.semesterId, programId: query.programId },
    select: offeringSelect, orderBy: { id: "asc" }, cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0, take: query.limit + 1 });
  return page(records, query.limit);
}

export async function createOffering(user: AuthUser, input: OfferingCreate) {
  await validateOffering(input);
  const semester = await prisma.semester.findUnique({ where: { id: input.semesterId }, select: { id: true } });
  if (!semester) throw new HttpError(422, "INVALID_SEMESTER", "The selected semester does not exist.");
  try {
    return await prisma.$transaction(async (tx) => {
      const offering = await tx.courseOffering.create({ data: input, select: offeringSelect });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "COURSE_OFFERING_CREATED", entityType: "CourseOffering", entityId: offering.id, changes: input } });
      return offering;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "OFFERING_EXISTS", "This course is already offered to the programme and level in that semester.");
    }
    throw error;
  }
}

export async function updateOffering(user: AuthUser, offeringId: string, input: OfferingUpdate) {
  const existing = await prisma.courseOffering.findUnique({ where: { id: offeringId }, select: { courseId: true, programId: true } });
  if (!existing) throw new HttpError(404, "OFFERING_NOT_FOUND", "Course offering was not found.");
  await validateOffering({ ...existing, lecturerId: input.lecturerId });
  return prisma.$transaction(async (tx) => {
    const offering = await tx.courseOffering.update({ where: { id: offeringId }, data: input, select: offeringSelect });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "COURSE_OFFERING_UPDATED", entityType: "CourseOffering", entityId: offering.id, changes: input } });
    return offering;
  });
}

const resultBatchListSelect = {
  id: true, status: true, submittedAt: true, feedback: true,
  submitter: { select: { name: true } },
  offering: { select: { id: true, level: true, course: { select: { code: true, title: true } },
    program: { select: { code: true, name: true } }, semester: { select: { term: true, session: { select: { name: true } } } },
    _count: { select: { registrations: true } },
  } },
  _count: { select: { results: true } },
} satisfies Prisma.ResultBatchSelect;

export async function getResultBatches(query: ResultBatchQuery): Promise<object> {
  const records = await prisma.resultBatch.findMany({ where: { status: query.status }, select: resultBatchListSelect,
    orderBy: { id: "asc" }, cursor: query.cursor ? { id: query.cursor } : undefined, skip: query.cursor ? 1 : 0, take: query.limit + 1 });
  return page(records, query.limit);
}

export async function getResultBatch(batchId: string): Promise<object> {
  const batch = await prisma.resultBatch.findUnique({ where: { id: batchId }, select: {
    ...resultBatchListSelect, reviewer: { select: { name: true } }, reviewedAt: true,
    results: { orderBy: { registration: { student: { matricNumber: "asc" } } }, select: {
      id: true, caScore: true, examScore: true, totalScore: true, grade: true, gradePoint: true,
      registration: { select: { id: true, student: { select: { matricNumber: true, user: { select: { name: true } } } } } },
    } },
  } });
  if (!batch) throw new HttpError(404, "RESULT_BATCH_NOT_FOUND", "Result batch was not found.");
  return { ...batch, results: batch.results.map((result) => ({ ...result, caScore: Number(result.caScore),
    examScore: Number(result.examScore), totalScore: Number(result.totalScore) })) };
}

async function reviewResultBatch(user: AuthUser, batchId: string, status: typeof ResultBatchStatus.APPROVED | typeof ResultBatchStatus.REJECTED,
  feedback: string | null): Promise<object> {
  return prisma.$transaction(async (tx): Promise<object> => {
    const updated = await tx.resultBatch.updateMany({ where: { id: batchId, status: ResultBatchStatus.SUBMITTED }, data: {
      status, reviewerId: user.id, reviewedAt: new Date(), feedback,
    } });
    if (updated.count === 0) {
      const exists = await tx.resultBatch.count({ where: { id: batchId } });
      if (exists === 0) throw new HttpError(404, "RESULT_BATCH_NOT_FOUND", "Result batch was not found.");
      throw new HttpError(409, "RESULT_BATCH_NOT_SUBMITTED", "Only submitted result batches can be reviewed.");
    }
    await tx.auditEvent.create({ data: { actorId: user.id, action: status === ResultBatchStatus.APPROVED ? "RESULT_BATCH_APPROVED" : "RESULT_BATCH_REJECTED",
      entityType: "ResultBatch", entityId: batchId, changes: { status, feedback } } });
    return tx.resultBatch.findUniqueOrThrow({ where: { id: batchId }, select: { id: true, status: true, reviewedAt: true, feedback: true } });
  });
}

export function approveResultBatch(user: AuthUser, batchId: string): Promise<object> {
  return reviewResultBatch(user, batchId, ResultBatchStatus.APPROVED, null);
}

export function rejectResultBatch(user: AuthUser, batchId: string, input: ResultRejection): Promise<object> {
  return reviewResultBatch(user, batchId, ResultBatchStatus.REJECTED, input.feedback);
}
