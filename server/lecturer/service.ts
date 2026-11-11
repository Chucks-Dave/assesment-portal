import "server-only";

import { Prisma, ResultBatchStatus } from "@/generated/prisma/client";
import type { AuthUser } from "@/server/auth/service";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { gradeFor } from "./grading";
import type { LecturerPageQuery, ResultEntry } from "./schema";

const offeringSelect = {
  id: true, level: true, creditUnits: true,
  course: { select: { code: true, title: true } },
  program: { select: { code: true, name: true } },
  semester: { select: { id: true, term: true, isActive: true, session: { select: { name: true } } } },
  resultBatches: { select: { id: true, status: true, feedback: true, submittedAt: true }, orderBy: { id: "desc" as const }, take: 1 },
  _count: { select: { registrations: true } },
} satisfies Prisma.CourseOfferingSelect;

async function lecturerFor(userId: string): Promise<{ id: string; user: { name: string; email: string }; department: { code: string; name: string } }> {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId }, select: {
    id: true, user: { select: { name: true, email: true } }, department: { select: { code: true, name: true } },
  } });
  if (!lecturer) throw new HttpError(404, "LECTURER_PROFILE_NOT_FOUND", "Lecturer profile was not found.");
  return lecturer;
}

async function assignedOffering(userId: string, offeringId: string): Promise<{ lecturerId: string; offering: Prisma.CourseOfferingGetPayload<{ select: typeof offeringSelect }> }> {
  const lecturer = await lecturerFor(userId);
  const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, lecturerId: lecturer.id }, select: offeringSelect });
  if (!offering) throw new HttpError(404, "OFFERING_NOT_FOUND", "Assigned course offering was not found.");
  return { lecturerId: lecturer.id, offering };
}

function page<T extends { id: string }>(records: T[], limit: number): { items: T[]; nextCursor: string | null } {
  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getLecturerDashboard(user: AuthUser): Promise<object> {
  const lecturer = await lecturerFor(user.id);
  const offerings = await prisma.courseOffering.findMany({ where: { lecturerId: lecturer.id, semester: { isActive: true } }, select: offeringSelect, orderBy: { id: "asc" } });
  const registeredStudents = offerings.reduce((total, offering) => total + offering._count.registrations, 0);
  const submittedBatches = offerings.filter((offering) => offering.resultBatches[0]?.status === ResultBatchStatus.SUBMITTED).length;
  return { lecturer, offerings, summary: { assignedCourses: offerings.length, registeredStudents, submittedBatches } };
}

export async function getLecturerOfferings(user: AuthUser, query: LecturerPageQuery): Promise<object> {
  const lecturer = await lecturerFor(user.id);
  const records = await prisma.courseOffering.findMany({ where: { lecturerId: lecturer.id, semesterId: query.semesterId }, select: offeringSelect,
    orderBy: { id: "asc" }, cursor: query.cursor ? { id: query.cursor } : undefined, skip: query.cursor ? 1 : 0, take: query.limit + 1 });
  return page(records, query.limit);
}

export async function getOfferingRoster(user: AuthUser, offeringId: string): Promise<object> {
  const { offering } = await assignedOffering(user.id, offeringId);
  const registrations = await prisma.registration.findMany({ where: { offeringId }, orderBy: { student: { matricNumber: "asc" } }, select: {
    id: true, student: { select: { matricNumber: true, user: { select: { name: true } } } },
    result: { select: { caScore: true, examScore: true, totalScore: true, grade: true, batch: { select: { id: true, status: true, feedback: true } } } },
  } });
  return { offering, registrations: registrations.map((registration) => ({ ...registration, result: registration.result ? {
    ...registration.result, caScore: Number(registration.result.caScore), examScore: Number(registration.result.examScore), totalScore: Number(registration.result.totalScore),
  } : null })) };
}

export async function saveDraftResults(user: AuthUser, offeringId: string, input: ResultEntry): Promise<object> {
  const { offering } = await assignedOffering(user.id, offeringId);
  const existingBatch = offering.resultBatches[0];
  if (existingBatch && existingBatch.status !== ResultBatchStatus.DRAFT && existingBatch.status !== ResultBatchStatus.REJECTED) {
    throw new HttpError(409, "RESULTS_LOCKED", "Submitted or approved results cannot be edited.");
  }
  if (new Set(input.results.map((result) => result.registrationId)).size !== input.results.length) {
    throw new HttpError(422, "DUPLICATE_REGISTRATION", "Each student may appear only once.");
  }
  const owned = await prisma.registration.count({ where: { offeringId, id: { in: input.results.map((result) => result.registrationId) } } });
  if (owned !== input.results.length) throw new HttpError(422, "INVALID_REGISTRATION", "One or more students are not registered for this offering.");
  return prisma.$transaction(async (tx): Promise<object> => {
    const batch = existingBatch ? await tx.resultBatch.update({ where: { id: existingBatch.id }, data: { status: ResultBatchStatus.DRAFT, feedback: null } }) :
      await tx.resultBatch.create({ data: { offeringId, submitterId: user.id } });
    for (const entry of input.results) {
      const { registrationId, caScore, examScore } = entry;
      const totalScore = entry.caScore + entry.examScore;
      const grade = gradeFor(totalScore);
      await tx.result.upsert({ where: { registrationId }, update: { batchId: batch.id, caScore, examScore, totalScore, ...grade },
        create: { registrationId, batchId: batch.id, caScore, examScore, totalScore, ...grade } });
    }
    await tx.auditEvent.create({ data: { actorId: user.id, action: "RESULT_DRAFT_SAVED", entityType: "ResultBatch", entityId: batch.id,
      changes: { offeringId, resultCount: input.results.length } } });
    return { batchId: batch.id, savedCount: input.results.length };
  });
}

export async function submitResults(user: AuthUser, offeringId: string): Promise<object> {
  const { offering } = await assignedOffering(user.id, offeringId);
  const batch = offering.resultBatches[0];
  if (!batch || (batch.status !== ResultBatchStatus.DRAFT && batch.status !== ResultBatchStatus.REJECTED)) {
    throw new HttpError(409, "BATCH_NOT_EDITABLE", "A saved draft is required before submission.");
  }
  const [registrationCount, resultCount] = await prisma.$transaction([
    prisma.registration.count({ where: { offeringId } }), prisma.result.count({ where: { batchId: batch.id, registration: { offeringId } } }),
  ]);
  if (registrationCount === 0 || resultCount !== registrationCount) {
    throw new HttpError(422, "INCOMPLETE_RESULTS", "Enter results for every registered student before submission.");
  }
  return prisma.$transaction(async (tx): Promise<object> => {
    const submitted = await tx.resultBatch.update({ where: { id: batch.id }, data: { status: ResultBatchStatus.SUBMITTED, submittedAt: new Date(), feedback: null },
      select: { id: true, status: true, submittedAt: true } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "RESULT_BATCH_SUBMITTED", entityType: "ResultBatch", entityId: batch.id, changes: { offeringId, resultCount } } });
    return submitted;
  });
}
