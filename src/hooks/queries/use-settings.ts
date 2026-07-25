import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getSettings, saveSettings, getSecret, setSecret } from "@/services/config";
import { checkCliAvailable } from "@/services/claudeRunner";
import { checkGhAvailable } from "@/services/githubConnector";
import type { AppSettings } from "@/types";

/** Uygulama ayarları. */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.app(),
    queryFn: getSettings,
  });
}

/** Ayarları (kısmi) günceller. */
export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => saveSettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.app() }),
  });
}

export interface ToolStatus {
  cliAvailable: boolean;
  ghAvailable: boolean;
  hasApiKey: boolean;
  hasGithubToken: boolean;
}

/** CLI/gh erişimi ve sır varlığı — Ayarlar ekranında durum göstergesi. */
export function useToolStatus() {
  return useQuery<ToolStatus>({
    queryKey: queryKeys.settings.status(),
    queryFn: async () => {
      const [cliAvailable, ghAvailable, apiKey, githubToken] = await Promise.all([
        checkCliAvailable(),
        checkGhAvailable(),
        getSecret("anthropicApiKey"),
        getSecret("githubToken"),
      ]);
      return {
        cliAvailable,
        ghAvailable,
        hasApiKey: apiKey.length > 0,
        hasGithubToken: githubToken.length > 0,
      };
    },
    staleTime: 0,
  });
}

type SecretName = "anthropicApiKey" | "githubToken";

/** Bir sırrı kaydeder (API key / GitHub token). */
export function useSaveSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, value }: { name: SecretName; value: string }) => setSecret(name, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.status() }),
  });
}
