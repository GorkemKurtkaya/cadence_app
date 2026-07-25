// Query key factory — string yazma, HER ZAMAN buradan kullan.
export const queryKeys = {
  reports: {
    all: ["reports"] as const,
    dates: () => [...queryKeys.reports.all, "dates"] as const,
    list: () => [...queryKeys.reports.all, "list"] as const,
    detail: (date: string) => [...queryKeys.reports.all, "detail", date] as const,
    commits: (date: string) => [...queryKeys.reports.all, "commits", date] as const,
  },
  commits: {
    all: ["commits"] as const,
    range: (from: string, to: string) => [...queryKeys.commits.all, "range", from, to] as const,
    recent: (limit: number) => [...queryKeys.commits.all, "recent", limit] as const,
  },
  stats: {
    all: ["stats"] as const,
    dashboard: (today: string, period: string) =>
      [...queryKeys.stats.all, "dashboard", today, period] as const,
    streak: (today: string) => [...queryKeys.stats.all, "streak", today] as const,
    projects: (from: string, to: string) => [...queryKeys.stats.all, "projects", from, to] as const,
  },
  settings: {
    all: ["settings"] as const,
    app: () => [...queryKeys.settings.all, "app"] as const,
    status: () => [...queryKeys.settings.all, "status"] as const,
  },
} as const;
