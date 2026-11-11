import axios from "axios";
import { z } from "zod";

export const API_TIMEOUT_MS = 15_000;
export const api = axios.create({
  baseURL: "/api",
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});
const errorSchema = z.object({ message: z.string() });

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<unknown>(error)) {
    if (!error.response)
      return "We couldn’t reach the portal. Check your connection and try again.";
    const result = errorSchema.safeParse(error.response.data);
    if (result.success && error.response.status < 500)
      return result.data.message;
  }
  return "The portal is unavailable right now. Please try again.";
}
