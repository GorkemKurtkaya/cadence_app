import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getCommitsByRange } from "@/services/storage";
import { scanRange } from "@/services/reportGenerator";
import { groupByDay } from "@/services/stats";
import type { CommitListDay } from "@/types";

/** Bir tarih aralığındaki commit'leri güne göre gruplu döner (Commitlerim ekranı). */
export function useCommitDays(from: string, to: string) {
  return useQuery<CommitListDay[]>({
    queryKey: queryKeys.commits.days(from, to),
    queryFn: async () => groupByDay(await getCommitsByRange(from, to)),
  });
}

/** Geçmiş commit'leri tarar ve depolar (Commitlerimi Çek). `from === null` → tüm geçmiş. */
export function useScanCommits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string | null; to: string }) => scanRange(from, to),
    onSuccess: () => {
      // Yeni commit'ler geldi → hem liste hem türetilmiş istatistikler tazelensin.
      queryClient.invalidateQueries({ queryKey: queryKeys.commits.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}
