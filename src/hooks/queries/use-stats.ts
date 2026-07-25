import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { queryKeys } from "@/lib/query/keys";
import { getCommitsByRange, getRecentCommits } from "@/services/storage";
import {
  computeDayActivity,
  computeProjectStats,
  computeRangeStats,
  computeStreak,
  fillCalendar,
  rangeFor,
  weeklyBuckets,
} from "@/services/stats";
import { todayKey } from "@/lib/date";
import type { CommitRow, DayActivity, ProjectStats, RangeStats, StreakStats } from "@/types";

function shift(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export interface DashboardData {
  weekStats: RangeStats;
  weekActivity: Array<{ label: string; count: number }>;
  projects: ProjectStats[];
  streak: StreakStats;
  heatmap21: DayActivity[];
  recent: CommitRow[];
}

/** Dashboard için tüm türetilmiş istatistikler (gerçek commit verisinden). */
export function useDashboard() {
  const today = todayKey();
  return useQuery<DashboardData>({
    queryKey: queryKeys.stats.dashboard(today),
    queryFn: async () => {
      // Streak/heatmap için geniş pencere (140 gün); haftalık kesitini içinden alırız.
      const from = shift(today, -139);
      const [all, recent] = await Promise.all([
        getCommitsByRange(from, today),
        getRecentCommits(6),
      ]);
      const activity = computeDayActivity(all);
      const week = rangeFor("weekly", today);
      const weekCommits = all.filter((c) => {
        const d = c.committedAt.slice(0, 10);
        return d >= week.from && d <= week.to;
      });
      return {
        weekStats: computeRangeStats(weekCommits),
        weekActivity: weeklyBuckets(computeDayActivity(weekCommits)),
        projects: computeProjectStats(weekCommits),
        streak: computeStreak(activity.map((a) => a.date), today),
        heatmap21: fillCalendar(activity, shift(today, -20), today),
        recent,
      };
    },
  });
}

export interface StreakData {
  streak: StreakStats;
  /** 20 hafta × 7 gün = 140 hücre (yeni sağda). */
  calendar: DayActivity[];
}

/** Streak ekranı: bir yıllık aktiviteden seri + 20 haftalık katkı takvimi. */
export function useStreak() {
  const today = todayKey();
  return useQuery<StreakData>({
    queryKey: queryKeys.stats.streak(today),
    queryFn: async () => {
      const all = await getCommitsByRange(shift(today, -364), today);
      const activity = computeDayActivity(all);
      return {
        streak: computeStreak(activity.map((a) => a.date), today),
        calendar: fillCalendar(activity, shift(today, -139), today),
      };
    },
  });
}
