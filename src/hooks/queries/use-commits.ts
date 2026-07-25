import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getCommitsByRange } from "@/services/storage";
import { groupByDay } from "@/services/stats";
import type { CommitListDay } from "@/types";

/** Bir tarih aralığındaki commit'leri güne göre gruplu döner (Commitlerim ekranı). */
export function useCommitDays(from: string, to: string) {
  return useQuery<CommitListDay[]>({
    queryKey: queryKeys.commits.range(from, to),
    queryFn: async () => groupByDay(await getCommitsByRange(from, to)),
  });
}
