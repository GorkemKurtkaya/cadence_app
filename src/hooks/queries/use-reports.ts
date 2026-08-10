import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  getReport,
  listReportDates,
  listReports,
  getCommitsByDate,
  getCommitsByRange,
} from "@/services/storage";
import {
  generateDailyReport,
  type GenerateOptions,
  type ProgressStep,
} from "@/services/reportGenerator";
import type { DailyReport } from "@/types";

/** Belirli günün kayıtlı raporu. */
export function useReport(date: string) {
  return useQuery({
    queryKey: queryKeys.reports.detail(date),
    queryFn: () => getReport(date),
  });
}

/** Belirli günün kayıtlı commit listesi. */
export function useCommits(date: string) {
  return useQuery({
    queryKey: queryKeys.reports.commits(date),
    queryFn: () => getCommitsByDate(date),
  });
}

/** `[from..to]` aralığının kayıtlı commit listesi (rapor drawer'ı periyoda göre kullanır). */
export function useCommitsRange(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.commits.range(from, to),
    queryFn: () => getCommitsByRange(from, to),
  });
}

/** Rapor bulunan günlerin listesi (yeni→eski). */
export function useReportDates() {
  return useQuery({
    queryKey: queryKeys.reports.dates(),
    queryFn: listReportDates,
  });
}

/** Tüm raporlar meta verisiyle (yeni→eski) — Rapor Geçmişi ekranı. */
export function useReports() {
  return useQuery<DailyReport[]>({
    queryKey: queryKeys.reports.list(),
    queryFn: listReports,
  });
}

interface GenerateVars {
  date: string;
  onProgress?: (step: ProgressStep) => void;
  options?: GenerateOptions;
}

/** Günlük raporu üretir; başarıda ilgili query'leri invalidate eder. */
export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, onProgress, options }: GenerateVars) =>
      generateDailyReport(date, onProgress, options),
    onSuccess: (_result, { date }) => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.detail(date) });
      qc.invalidateQueries({ queryKey: queryKeys.reports.commits(date) });
      qc.invalidateQueries({ queryKey: queryKeys.reports.dates() });
      qc.invalidateQueries({ queryKey: queryKeys.reports.list() });
      // Tarama commit'leri de kaydettiği için istatistik/commit ekranlarını tazele.
      qc.invalidateQueries({ queryKey: queryKeys.commits.all });
      qc.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}
