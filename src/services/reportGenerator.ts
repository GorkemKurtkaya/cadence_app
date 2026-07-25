// Günlük rapor orkestrasyonu: topla → prompt → Claude → parse → kaydet.
import { getLogger } from "./logger";
import { getSettings } from "./config";
import { scanLocalCommits } from "./repoScanner";
import { fetchGithubCommits, mergeCommits } from "./githubConnector";
import { upsertRepo, saveCommits, saveReport } from "./storage";
import { buildReportPrompt } from "./report/prompt";
import { parseReportSections } from "./report/parse";
import { runClaude } from "./claudeRunner";
import type { CommitInfo, DailyReport, ReportLength, ReportPeriod, ReportTone } from "@/types";

const log = getLogger("reportGenerator");

/** Rapor üretim tercihleri (drawer/header'dan gelir; boşsa ayar varsayılanları). */
export interface GenerateOptions {
  period?: ReportPeriod;
  length?: ReportLength;
  tone?: ReportTone;
}

export interface ScanResult {
  date: string;
  commits: CommitInfo[];
}

export interface GenerateResult {
  report: DailyReport;
  commitCount: number;
}

export type ProgressStep =
  | { kind: "scan"; repoName: string }
  | { kind: "github" }
  | { kind: "claude" }
  | { kind: "save" };

/** Belirli günün commit'lerini tarar ve depolar (rapor üretmeden). */
export async function scanDay(
  date: string,
  onProgress?: (step: ProgressStep) => void,
): Promise<ScanResult> {
  const settings = await getSettings();

  const { repos, commits: local } = await scanLocalCommits(
    settings.repoRoots,
    date,
    (repoName) => onProgress?.({ kind: "scan", repoName }),
    { allBranches: settings.scanAllBranches, onlyMine: settings.onlyMyCommits },
  );
  for (const repo of repos) await upsertRepo(repo);

  onProgress?.({ kind: "github" });
  const github = await fetchGithubCommits(date);

  const all = mergeCommits(local, github);
  await saveCommits(all);

  return { date, commits: all };
}

/** Günün raporunu uçtan uca üretir ve kaydeder. */
export async function generateDailyReport(
  date: string,
  onProgress?: (step: ProgressStep) => void,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const { commits } = await scanDay(date, onProgress);
  const settings = await getSettings();
  const period = opts.period ?? settings.defaultPeriod;
  const length = opts.length ?? settings.defaultLength;
  const tone = opts.tone ?? settings.defaultTone;

  // Commit yoksa Claude'u çağırmadan boş rapor üret (maliyet/gürültü yok).
  if (commits.length === 0) {
    const empty: DailyReport = {
      reportDate: date,
      summaryMd: "Bu güne ait commit bulunamadı.",
      standupMd: "",
      technicalMd: "",
      model: "-",
      mode: settings.claudeMode,
      createdAt: new Date().toISOString(),
      period,
      length,
      tone,
    };
    await saveReport(empty);
    log.info(`${date}: commit yok, boş rapor kaydedildi`);
    return { report: empty, commitCount: 0 };
  }

  onProgress?.({ kind: "claude" });
  const prompt = buildReportPrompt(date, commits, {
    sections: settings.reportSections,
    customInstructions: settings.customInstructions,
    template: settings.promptTemplate,
    period,
    length,
    tone,
  });
  const { text, model, mode } = await runClaude(prompt);

  const sections = parseReportSections(text);
  const report: DailyReport = {
    reportDate: date,
    ...sections,
    model,
    mode,
    createdAt: new Date().toISOString(),
    period,
    length,
    tone,
  };

  onProgress?.({ kind: "save" });
  await saveReport(report);
  log.info(`${date}: rapor üretildi (${commits.length} commit, ${mode}/${model})`);
  return { report, commitCount: commits.length };
}
