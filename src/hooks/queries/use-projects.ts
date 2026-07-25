import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getCommitsByRange, listRepos } from "@/services/storage";
import { computeProjectStats } from "@/services/stats";
import type { ProjectStats } from "@/types";

/** Aralıktaki proje bazlı istatistikler + repo yolları (Projeler ekranı). */
export function useProjects(from: string, to: string) {
  return useQuery<ProjectStats[]>({
    queryKey: queryKeys.stats.projects(from, to),
    queryFn: async () => {
      const [commits, repos] = await Promise.all([getCommitsByRange(from, to), listRepos()]);
      const pathByName = new Map(repos.map((r) => [r.name, r.path]));
      return computeProjectStats(commits).map((p) => ({
        ...p,
        repoPath: pathByName.get(p.repoName) ?? "",
      }));
    },
  });
}
