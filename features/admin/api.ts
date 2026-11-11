import { api } from "@/lib/http-client";
import { adminDashboardResponseSchema, adminOptionsResponseSchema, adminUserResponseSchema, adminUsersResponseSchema, resultBatchDetailResponseSchema, resultBatchListResponseSchema, type AdminDashboard, type AdminOptions, type AdminUser, type AdminUserInput, type AdminUserPage, type AdminUserPasswordInput, type CourseInput, type OfferingInput, type ResultBatchDetail, type ResultBatchSummary, type ResultRejectionInput } from "@/shared/admin";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

export const ADMIN_DASHBOARD_QUERY_KEY = ["admin", "dashboard"] as const;
export const ADMIN_OPTIONS_QUERY_KEY = ["admin", "options"] as const;
export const ADMIN_RESULT_BATCHES_QUERY_KEY = ["admin", "result-batches"] as const;
export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

export async function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboard> {
  const response = await api.get<unknown>("/admin/dashboard", { signal });
  return adminDashboardResponseSchema.parse(response.data).payload;
}

export async function getAdminOptions(signal?: AbortSignal): Promise<AdminOptions> {
  const response = await api.get<unknown>("/admin/options", { signal });
  return adminOptionsResponseSchema.parse(response.data).payload;
}

export async function createCourse(input: CourseInput): Promise<void> {
  await api.post("/admin/courses", { ...input, code: input.code.toUpperCase() });
}

export async function createOffering(input: OfferingInput): Promise<void> {
  await api.post("/admin/offerings", { ...input, lecturerId: input.lecturerId || null });
}

export async function getAdminUsers(filters: { search: string; role: UserRole | ""; status: UserStatus | "" }, cursor: string | null, signal?: AbortSignal): Promise<AdminUserPage> {
  const response = await api.get<unknown>("/admin/users", { params: { limit: 20, search: filters.search || undefined, role: filters.role || undefined, status: filters.status || undefined, cursor: cursor ?? undefined }, signal });
  return adminUsersResponseSchema.parse(response.data).payload;
}

export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  const assignment = input.role === "STUDENT" ? { programId: input.programId, matricNumber: input.matricNumber, level: input.level }
    : input.role === "LECTURER" ? { departmentId: input.departmentId } : {};
  const response = await api.post<unknown>("/admin/users", { name: input.name, email: input.email, password: input.password, role: input.role, ...assignment });
  return adminUserResponseSchema.parse(response.data).payload;
}

export async function updateAdminUserStatus(input: { userId: string; status: UserStatus }): Promise<AdminUser> {
  const response = await api.patch<unknown>(`/admin/users/${input.userId}`, { status: input.status });
  return adminUserResponseSchema.parse(response.data).payload;
}

export async function revokeAdminUserSessions(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}/sessions`);
}

export async function resetAdminUserPassword(input: AdminUserPasswordInput & { userId: string }): Promise<void> {
  await api.patch(`/admin/users/${input.userId}/password`, { password: input.password });
}

export async function getSubmittedResultBatches(signal?: AbortSignal): Promise<ResultBatchSummary[]> {
  const response = await api.get<unknown>("/admin/result-batches", { params: { status: "SUBMITTED", limit: 50 }, signal });
  return resultBatchListResponseSchema.parse(response.data).payload.items;
}

export async function getResultBatch(batchId: string, signal?: AbortSignal): Promise<ResultBatchDetail> {
  const response = await api.get<unknown>(`/admin/result-batches/${batchId}`, { signal });
  return resultBatchDetailResponseSchema.parse(response.data).payload;
}

export async function approveResultBatch(batchId: string): Promise<void> { await api.post(`/admin/result-batches/${batchId}/approve`, {}); }
export async function rejectResultBatch(batchId: string, input: ResultRejectionInput): Promise<void> { await api.post(`/admin/result-batches/${batchId}/reject`, input); }
