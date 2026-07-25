import { createHashHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { CommitsPage } from "@/features/commits/commits-page";
import { ProjectsPage } from "@/features/projects/projects-page";
import { HistoryPage } from "@/features/history/history-page";
import { StreakPage } from "@/features/streak/streak-page";
import { ReportDetailPage } from "@/features/report/report-detail-page";
import { SettingsPage } from "@/features/settings/settings-page";

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const commitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/commits",
  component: CommitsPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: HistoryPage,
});

const streakRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/streak",
  component: StreakPage,
});

const reportDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/report/$date",
  component: function ReportRoute() {
    const { date } = reportDetailRoute.useParams();
    return <ReportDetailPage date={date} />;
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  commitsRoute,
  projectsRoute,
  reportsRoute,
  streakRoute,
  reportDetailRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
