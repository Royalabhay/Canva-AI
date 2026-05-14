"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      mutations: { retry: 2 },
      queries: { staleTime: 30_000, refetchOnWindowFocus: false }
    }
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
