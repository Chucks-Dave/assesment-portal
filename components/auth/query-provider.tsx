"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement, type ReactNode } from "react";

export function QueryProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [client] = useState(
    (): QueryClient =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0, gcTime: 0 },
          mutations: { retry: false, gcTime: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
