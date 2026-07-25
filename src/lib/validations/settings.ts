import { z } from "zod";

// Ayar formu şeması. repoRoots UI'da çok satırlı metin; kaydederken diziye çevrilir.
export const settingsFormSchema = z.object({
  repoRootsText: z.string(),
  claudeMode: z.enum(["cli", "api"]),
  model: z.string().min(1, "Model boş olamaz"),
  githubEnabled: z.boolean(),
  githubUsername: z.string(),
  // Tarama
  scanAllBranches: z.boolean(),
  onlyMyCommits: z.boolean(),
  // Rapor formatı (yapılandırılmış mod)
  sectionSummary: z.boolean(),
  sectionStandup: z.boolean(),
  sectionTechnical: z.boolean(),
  customInstructions: z.string(),
  // Rapor varsayılanları
  defaultPeriod: z.enum(["daily", "weekly", "monthly", "yearly"]),
  defaultLength: z.enum(["short", "medium", "detailed"]),
  defaultTone: z.string(),
  promptTemplate: z.string(),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/** Çok satırlı metni temiz yol listesine çevirir. */
export function parseRepoRoots(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
