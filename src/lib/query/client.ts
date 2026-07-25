import { QueryClient } from "@tanstack/react-query";

// Frontend kurallarındaki değerler: staleTime 5dk, gcTime 30dk, retry 1.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
