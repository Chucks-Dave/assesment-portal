import { api } from "@/lib/http-client";
import { lecturerDashboardResponseSchema, offeringRosterResponseSchema, type LecturerDashboard, type OfferingRoster, type ResultForm } from "@/shared/lecturer";

export const LECTURER_DASHBOARD_QUERY_KEY = ["lecturer", "dashboard"] as const;
export const lecturerRosterQueryKey = (offeringId: string) => ["lecturer", "offerings", offeringId] as const;

export async function getLecturerDashboard(signal?: AbortSignal): Promise<LecturerDashboard> {
  const response = await api.get<unknown>("/lecturer/dashboard", { signal });
  return lecturerDashboardResponseSchema.parse(response.data).payload;
}

export async function getOfferingRoster(offeringId: string, signal?: AbortSignal): Promise<OfferingRoster> {
  const response = await api.get<unknown>(`/lecturer/offerings/${offeringId}`, { signal });
  return offeringRosterResponseSchema.parse(response.data).payload;
}

export async function saveResultDraft(offeringId: string, input: ResultForm): Promise<void> {
  await api.put(`/lecturer/offerings/${offeringId}/results`, input);
}

export async function submitResultBatch(offeringId: string): Promise<void> {
  await api.post(`/lecturer/offerings/${offeringId}/submit`, {});
}
