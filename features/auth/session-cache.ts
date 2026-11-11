import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/shared/auth";
import { SESSION_QUERY_KEY } from "./api";

export async function replaceSession(
  client: QueryClient,
  user: AuthUser | null,
): Promise<void> {
  await client.cancelQueries();
  // Preserve the mounted session observer while removing the previous account's other cached data.
  client.removeQueries({
    predicate: (query): boolean =>
      query.queryHash !== hashKey(SESSION_QUERY_KEY),
  });
  client.getMutationCache().clear();
  client.setQueryData(SESSION_QUERY_KEY, user);
}
