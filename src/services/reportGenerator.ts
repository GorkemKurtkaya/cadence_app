// Günlük rapor orkestrasyonu: topla → prompt → Claude → parse → kaydet.
import { getLogger } from "./logger";
import { getSettings } from "./config";
import { scanLocalCommitsRange } from "./repoScanner";
import { fetchGithubCommitsRange, mergeCommits } from "./githubConnector";
import { rangeFor } from "./stats";
import { upsertRepo, saveCommits, saveReport } from "./storage";
import { buildReportPrompt, DEFAULT_PROMPT_TEMPLATE } from "./report/prompt";
import { parseReportSections } from "./report/parse";
import { filterBySelectedShas } from "./report/select";
import { runClaude } from "./claudeRunner";
import type { CommitInfo, DailyReport, ReportLength, ReportPeriod, ReportTone } from "@/types";

const log = getLogger("reportGenerator");

/** Rapor üretim tercihleri (drawer/header'dan gelir; boşsa ayar varsayılanları). */
export interface GenerateOptions {
  period?: ReportPeriod;
  length?: ReportLength;
  tone?: ReportTone;
  /** Yalnız bu SHA'lardaki commit'ler rapora girer. Boş/undefined → hepsi. */
  selectedShas?: string[];
}

export interface ScanRangeResult {
  from: string | null;
  to: string;
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

/**
 * `[from..to]` aralığının yerel commit'lerini tarar ve depolar (geçmiş geri-doldurma).
 * `from === null` → tüm geçmiş. GitHub geri-doldurma kapsam dışı (yalnız yerel git).
 * `saveCommits` idempotent upsert olduğu için tekrar çekmek duplicate üretmez.
 */
export async function scanRange(
  from: string | null,
  to: string,
  onProgress?: (step: ProgressStep) => void,
): Promise<ScanRangeResult> {
  const settings = await getSettings();

  const { repos, commits } = await scanLocalCommitsRange(
    settings.repoRoots,
    from,
    to,
    (repoName) => onProgress?.({ kind: "scan", repoName }),
    {
      allBranches: settings.scanAllBranches,
      onlyMine: settings.onlyMyCommits,
      aliases: settings.projectAliases,
    },
  );
  for (const repo of repos) await upsertRepo(repo);

  onProgress?.({ kind: "save" });
  await saveCommits(commits);
  log.info(`${from ?? "başlangıç"}–${to}: ${commits.length} yerel commit kaydedildi`);

  return { from, to, commits };
}

/**
 * Raporu uçtan uca üretir ve kaydeder. Kapsanan commit'ler seçilen **periyodun**
 * aralığıyla belirlenir (`rangeFor`): Günlük → yalnız `date`; Haftalık/Aylık/Yıllık →
 * periyot başından `date`'e kadar. Rapor `date` anahtarıyla saklanır.
 */
export async function generateDailyReport(
  date: string,
  onProgress?: (step: ProgressStep) => void,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const settings = await getSettings();
  const period = opts.period ?? settings.defaultPeriod;
  const length = opts.length ?? settings.defaultLength;
  const tone = opts.tone ?? settings.defaultTone;

  // Periyoda göre aralık: bitiş = rapor tarihi (date), başlangıç = periyot başı.
  const { from, to } = rangeFor(period, date);

  // Aralığın yerel commit'lerini tara + GitHub'ı aralıkla çek, birleştir, depola.
  const { repos, commits: local } = await scanLocalCommitsRange(
    settings.repoRoots,
    from,
    to,
    (repoName) => onProgress?.({ kind: "scan", repoName }),
    {
      allBranches: settings.scanAllBranches,
      onlyMine: settings.onlyMyCommits,
      aliases: settings.projectAliases,
    },
  );
  for (const repo of repos) await upsertRepo(repo);

  onProgress?.({ kind: "github" });
  const github = await fetchGithubCommitsRange(from, to);
  const scanned = mergeCommits(local, github);
  await saveCommits(scanned);

  // Seçili SHA'lar verildiyse yalnız onları al; boşsa aralığın tümü.
  const commits = filterBySelectedShas(scanned, opts.selectedShas);

  // Commit yoksa Claude'u çağırmadan boş rapor üret (maliyet/gürültü yok).
  if (commits.length === 0) {
    const empty: DailyReport = {
      reportDate: date,
      summaryMd: "Seçilen aralıkta commit bulunamadı.",
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
    // Boş template → changelog varsayılanı (Ayarlar önizlemesindeki effectiveTemplate ile tutarlı).
    template: settings.promptTemplate?.trim() || DEFAULT_PROMPT_TEMPLATE,
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
