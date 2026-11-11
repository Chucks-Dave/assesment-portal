import { api } from "@/lib/http-client";
import {
  studentDashboardResponseSchema,
  studentOfferingsResponseSchema,
  studentResultsResponseSchema,
  studentHistoryResponseSchema,
  studentRegistrationsResponseSchema,
  type StudentDashboard,
  type StudentRegistration,
  type StudentOffering,
  type StudentResultPage,
  type StudentHistoryPage,
} from "@/shared/student";

export const STUDENT_DASHBOARD_QUERY_KEY = ["student", "dashboard"] as const;
export const STUDENT_REGISTRATIONS_QUERY_KEY = ["student", "registrations"] as const;
export const STUDENT_OFFERINGS_QUERY_KEY = ["student", "offerings"] as const;
export const STUDENT_RESULTS_QUERY_KEY = ["student", "results"] as const;
export const STUDENT_HISTORY_QUERY_KEY = ["student", "history"] as const;

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
  const response = await api.get<unknown>("/student/registrations", { params: { limit: 50, semesterId }, signal });
  return studentRegistrationsResponseSchema.parse(response.data).payload.items;
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

export async function getStudentHistory(cursor: string | null, signal?: AbortSignal): Promise<StudentHistoryPage> {
  const response = await api.get<unknown>("/student/history", { params: { limit: 20, cursor: cursor ?? undefined }, signal });
  return studentHistoryResponseSchema.parse(response.data).payload;
}
