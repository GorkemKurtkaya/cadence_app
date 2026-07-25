import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { queryKeys } from "@/lib/query/keys";
import { getCommitsByRange, getRecentCommits } from "@/services/storage";
import {
  buildYearCalendar,
  computeDayActivity,
  computeProjectStats,
  computeRangeStats,
  computeStreak,
  fillCalendar,
  rangeFor,
  weeklyBuckets,
} from "@/services/stats";
import { todayKey } from "@/lib/date";
import type {
  CommitRow,
  DayActivity,
  ProjectStats,
  RangeStats,
  ReportPeriod,
  StreakStats,
  YearCalendar,
} from "@/types";

function shift(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export interface DashboardData {
  /** Seçili periyodun (Gün/Hafta/Ay/Yıl) toplamları. */
  periodStats: RangeStats;
  /** Haftalık aktivite (Pzt→Paz) — periyottan bağımsız, her zaman bu hafta. */
  weekActivity: Array<{ label: string; count: number }>;
  /** Seçili periyottaki proje dağılımı. */
  projects: ProjectStats[];
  streak: StreakStats;
  heatmap21: DayActivity[];
  recent: CommitRow[];
}

/** Dashboard için tüm türetilmiş istatistikler (gerçek commit verisinden). */
export function useDashboard(period: ReportPeriod) {
  const today = todayKey();
  return useQuery<DashboardData>({
    queryKey: queryKeys.stats.dashboard(today, period),
    queryFn: async () => {
      const sel = rangeFor(period, today);
      // Streak/heatmap 140 günlük pencere ister; seçili periyot daha geriye giderse (yıllık) onu kapsayacak şekilde genişlet.
      const heatFrom = shift(today, -139);
      const fetchFrom = sel.from < heatFrom ? sel.from : heatFrom;
      const [all, recent] = await Promise.all([
        getCommitsByRange(fetchFrom, today),
        getRecentCommits(6),
      ]);
      const activity = computeDayActivity(all);
      const inRange = (from: string, to: string) =>
        all.filter((c) => {
          const d = c.committedAt.slice(0, 10);
          return d >= from && d <= to;
        });
      const selCommits = inRange(sel.from, sel.to);
      // "Haftalık aktivite" grafiği her zaman bu haftanın gün dağılımı (periyottan bağımsız).
      const week = rangeFor("weekly", today);
      const weekCommits = inRange(week.from, week.to);
      return {
        periodStats: computeRangeStats(selCommits),
        weekActivity: weeklyBuckets(computeDayActivity(weekCommits)),
        projects: computeProjectStats(selCommits),
        streak: computeStreak(activity.map((a) => a.date), today),
        heatmap21: fillCalendar(activity, shift(today, -20), today),
        recent,
      };
    },
  });
}

export interface StreakData {
  streak: StreakStats;
  /** GitHub tarzı yıllık katkı takvimi (~53 hafta). */
  calendar: YearCalendar;
}

/** Streak ekranı: bir yıllık aktiviteden seri + yıllık katkı takvimi. */
export function useStreak() {
  const today = todayKey();
  return useQuery<StreakData>({
    queryKey: queryKeys.stats.streak(today),
    queryFn: async () => {
      // Yıllık takvimi kapsayacak geniş pencere (54 hafta pay).
      const all = await getCommitsByRange(shift(today, -378), today);
      const activity = computeDayActivity(all);
      return {
        streak: computeStreak(activity.map((a) => a.date), today),
        calendar: buildYearCalendar(activity, today),
      };
    },
  });
}
