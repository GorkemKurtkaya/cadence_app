import { RouterProvider } from "@tanstack/react-router";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/sonner";
import { router } from "@/router";

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  );
}
