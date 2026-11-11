import { api } from "@/lib/http-client";
import { adminDashboardResponseSchema, adminOptionsResponseSchema, resultBatchDetailResponseSchema, resultBatchListResponseSchema, type AdminDashboard, type AdminOptions, type CourseInput, type OfferingInput, type ResultBatchDetail, type ResultBatchSummary, type ResultRejectionInput } from "@/shared/admin";

export const ADMIN_DASHBOARD_QUERY_KEY = ["admin", "dashboard"] as const;
export const ADMIN_OPTIONS_QUERY_KEY = ["admin", "options"] as const;
export const ADMIN_RESULT_BATCHES_QUERY_KEY = ["admin", "result-batches"] as const;

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
