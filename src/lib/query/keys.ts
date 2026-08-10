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
    // Düz commit listesi (CommitRow[]) — rapor drawer'ı kullanır.
    range: (from: string, to: string) => [...queryKeys.commits.all, "range", from, to] as const,
    // Güne göre gruplu liste (CommitListDay[]) — Commitlerim ekranı.
    // range ile AYNI şekli paylaşmadığı için ayrı key: aksi halde cache çakışır.
    days: (from: string, to: string) => [...queryKeys.commits.all, "days", from, to] as const,
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
  repos: {
    all: ["repos"] as const,
    list: () => [...queryKeys.repos.all, "list"] as const,
  },
} as const;
