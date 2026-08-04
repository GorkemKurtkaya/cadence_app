import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { listRepos } from "@/services/storage";
import type { Repo } from "@/types";

/** Taranıp DB'ye kaydedilmiş repolar (Ayarlar'daki proje-adı editörü için). */
export function useRepos() {
  return useQuery<Repo[]>({
    queryKey: queryKeys.repos.list(),
    queryFn: listRepos,
  });
}
