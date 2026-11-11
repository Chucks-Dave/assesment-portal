import { api } from "@/lib/http-client";
import type { AxiosResponse } from "axios";
import {
  studentDashboardResponseSchema,
  studentOfferingsResponseSchema,
  studentResultsResponseSchema,
  studentHistoryResponseSchema,
  studentProfileResponseSchema,
  studentRegistrationsResponseSchema,
  type StudentDashboard,
  type StudentRegistration,
  type StudentOffering,
  type StudentResultPage,
  type StudentHistoryPage,
  type StudentProfile,
  type StudentProfileUpdate,
} from "@/shared/student";

export const STUDENT_DASHBOARD_QUERY_KEY = ["student", "dashboard"] as const;
export const STUDENT_REGISTRATIONS_QUERY_KEY = ["student", "registrations"] as const;
export const STUDENT_OFFERINGS_QUERY_KEY = ["student", "offerings"] as const;
export const STUDENT_RESULTS_QUERY_KEY = ["student", "results"] as const;
export const STUDENT_HISTORY_QUERY_KEY = ["student", "history"] as const;
export const STUDENT_PROFILE_QUERY_KEY = ["student", "profile"] as const;

export async function getStudentDashboard(signal?: AbortSignal): Promise<StudentDashboard> {
  const response = await api.get<unknown>("/student/dashboard", { signal });
  return studentDashboardResponseSchema.parse(response.data).payload;
}

export async function getRecentRegistrations(semesterId: string, signal?: AbortSignal): Promise<StudentRegistration[]> {
  const response = await api.get<unknown>("/student/registrations", { params: { limit: 4, semesterId }, signal });
  return studentRegistrationsResponseSchema.parse(response.data).payload.items;
}

export async function getEligibleCourses(signal?: AbortSignal): Promise<StudentOffering[]> {
  const response = await api.get<unknown>("/student/courses", { params: { limit: 50 }, signal });
  return studentOfferingsResponseSchema.parse(response.data).payload.items;
}

export async function getRegistrations(semesterId: string, signal?: AbortSignal): Promise<StudentRegistration[]> {
  const items: StudentRegistration[] = [];
  let cursor: string | null = null;
  do {
    const response: AxiosResponse<unknown> = await api.get<unknown>("/student/registrations", { params: { limit: 50, semesterId, cursor: cursor ?? undefined }, signal });
    const page = studentRegistrationsResponseSchema.parse(response.data).payload;
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

export async function registerCourses(offeringIds: string[]): Promise<void> {
  await api.post("/student/registrations", { offeringIds });
}

export async function withdrawRegistration(registrationId: string): Promise<void> {
  await api.delete(`/student/registrations/${registrationId}`);
}

export async function getStudentResults(cursor: string | null, signal?: AbortSignal): Promise<StudentResultPage> {
  const response = await api.get<unknown>("/student/results", { params: { limit: 20, cursor: cursor ?? undefined }, signal });
  return studentResultsResponseSchema.parse(response.data).payload;
}

export async function getStudentResultStatement(signal?: AbortSignal): Promise<StudentResultPage> {
  const firstPage = await getStudentResults(null, signal);
  const items = [...firstPage.items];
  let cursor = firstPage.nextCursor;
  while (cursor) {
    const page = await getStudentResults(cursor, signal);
    items.push(...page.items);
    cursor = page.nextCursor;
  }
  return { items, nextCursor: null, summary: firstPage.summary };
}

export async function getStudentHistory(cursor: string | null, signal?: AbortSignal): Promise<StudentHistoryPage> {
  const response = await api.get<unknown>("/student/history", { params: { limit: 20, cursor: cursor ?? undefined }, signal });
  return studentHistoryResponseSchema.parse(response.data).payload;
}

export async function getStudentProfile(signal?: AbortSignal): Promise<StudentProfile> {
  const response = await api.get<unknown>("/student/profile", { signal });
  return studentProfileResponseSchema.parse(response.data).payload;
}

export async function updateStudentProfile(input: StudentProfileUpdate): Promise<StudentProfile> {
  const response = await api.patch<unknown>("/student/profile", input);
  return studentProfileResponseSchema.parse(response.data).payload;
}
