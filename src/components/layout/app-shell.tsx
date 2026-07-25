import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ReportDrawer } from "./report-drawer";

/** Uygulama kabuğu: sidebar · (header + içerik) · rapor drawer'ı. */
export function AppShell() {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ReportDrawer />
    </div>
  );
}
