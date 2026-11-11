import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/http-client";
import { authUserSchema, type AuthUser, type LoginInput } from "@/shared/auth";

const sessionResponse = z.object({
  payload: z.object({ user: authUserSchema }),
});
export const SESSION_QUERY_KEY = ["auth", "current-user"] as const;

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  try {
    const response = await api.get<unknown>("/auth/me", { signal });
    return sessionResponse.parse(response.data).payload.user;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      [401, 403].includes(error.response?.status ?? 0)
    )
      return null;
    throw error;
  }
}

export async function signIn(input: LoginInput): Promise<AuthUser> {
  const response = await api.post<unknown>("/auth/login", input);
  return sessionResponse.parse(response.data).payload.user;
}

export async function signOut(): Promise<void> {
  await api.post("/auth/logout", {});
}
