// rapor_app paylaşılan tip tanımları

/** Claude'a nasıl bağlanılacağı. */
export type ClaudeMode = "cli" | "api";

/** Bir commit'in kaynağı. */
export type CommitSource = "local" | "github";

/** Diskteki bir git reposu. */
export interface Repo {
  id?: number;
  path: string;
  name: string;
  remote?: string | null;
  active: boolean;
}

/** Tek bir dosyanın değişim istatistiği (git numstat). */
export interface FileChange {
  file: string;
  additions: number;
  deletions: number;
}

/** Bir reponun katmanı (rapor gruplaması için). */
export type RepoLayer = "Backend" | "Frontend" | "Diğer";

/** git log'dan ayrıştırılmış tek commit (saf veri). */
export interface ParsedCommit {
  sha: string;
  committedAt: string; // ISO 8601
  author: string;
  message: string; // commit konusu (subject)
  body: string; // commit açıklaması (varsa)
  files: FileChange[];
  additions: number;
  deletions: number;
  filesChanged: number;
}

/** Depolamaya/rapora giden, repo bağlamı eklenmiş commit. */
export interface CommitInfo extends ParsedCommit {
  repoName: string;
  repoPath: string;
  project: string; // ör. "Story App" (repo adından türetilir)
  layer: RepoLayer;
  source: CommitSource;
  diffSummary: string;
}

/** Rapor periyodu (header/drawer/ayarlar toggle'ları). */
export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

/** Rapor uzunluğu tercihi. */
export type ReportLength = "short" | "medium" | "detailed";

/** Rapor tonu (serbest metin; varsayılan aşağıda). */
export type ReportTone = string;

/** Bir commit'in çalışma alanı (dosya yollarından türetilir). */
export type CommitArea = "be" | "fe" | "other";

/** Claude'un ürettiği 3 bölümlü günlük rapor. */
export interface DailyReport {
  reportDate: string; // YYYY-MM-DD
  summaryMd: string;
  standupMd: string;
  technicalMd: string;
  model: string;
  mode: ClaudeMode;
  createdAt: string; // ISO 8601
  // Rapor üretilirken seçilen tercihler (0003 migration'ıyla saklanır).
  period?: ReportPeriod;
  length?: ReportLength;
  tone?: ReportTone;
}

/** Raporda hangi bölümlerin üretileceği. */
export interface ReportSections {
  summary: boolean;
  standup: boolean;
  technical: boolean;
}

/** Uygulama ayarları (sırlar hariç — onlar ayrı tutulur). */
export interface AppSettings {
  repoRoots: string[];
  claudeMode: ClaudeMode;
  model: string;
  githubEnabled: boolean;
  githubUsername: string;
  // Tarama
  scanAllBranches: boolean;
  onlyMyCommits: boolean;
  // Rapor formatı
  reportSections: ReportSections;
  customInstructions: string;
  // Rapor varsayılanları (drawer/header bunları başlangıç değeri olarak kullanır)
  defaultPeriod: ReportPeriod;
  defaultLength: ReportLength;
  defaultTone: ReportTone;
  /** Düzenlenebilir rapor promptu. Boşsa dahili varsayılan (buildReportPrompt) kullanılır. */
  promptTemplate: string;
}

/** Varsayılan rapor tonu. */
export const DEFAULT_TONE = "Kendi ağzımdan, samimi";

export const DEFAULT_SETTINGS: AppSettings = {
  repoRoots: [],
  claudeMode: "cli",
  model: "claude-sonnet-5",
  githubEnabled: false,
  githubUsername: "",
  scanAllBranches: true,
  onlyMyCommits: true,
  reportSections: { summary: true, standup: true, technical: true },
  customInstructions: "",
  defaultPeriod: "daily",
  defaultLength: "detailed",
  defaultTone: DEFAULT_TONE,
  promptTemplate: "",
};

/** Geçmişte saklanan tek commit satırı (liste görünümü için). */
export interface CommitRow {
  sha: string;
  committedAt: string;
  author: string;
  message: string;
  body: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  source: CommitSource;
  repoName: string;
  /** Repo adından türetilen proje adı (okurken hesaplanır). */
  project: string;
  /** Dosya yollarından türetilen alan (be/fe/other). */
  area: CommitArea;
  /** diff_summary'den ayrıştırılan dosya yolları (chip'ler için). */
  paths: string[];
}

// ---- Agregasyon / istatistik tipleri (dashboard, streak, projeler) ----

/** Tek bir günün commit aktivitesi (streak/heatmap/haftalık grafik). */
export interface DayActivity {
  date: string; // YYYY-MM-DD
  count: number;
  additions: number;
  deletions: number;
}

/** Streak istatistikleri. */
export interface StreakStats {
  current: number;
  longest: number;
  totalActiveDays: number;
}

/** GitHub tarzı yıllık katkı takvimi verisi (hafta sütunları × 7 gün satırı). */
export interface YearCalendar {
  /** Pazartesi-hizalı gün serisi (uzunluk ≈ weeks*7; son hafta bugünde biter/kısmi olabilir). */
  days: DayActivity[];
  /** Sütun (hafta) sayısı — ~53. */
  weeks: number;
  /** Ayın değiştiği sütunlar → üstteki ay etiketleri. */
  months: { col: number; label: string }[];
}

/** Bir tarih aralığının toplamları (dashboard stat kartları). */
export interface RangeStats {
  commits: number;
  additions: number;
  deletions: number;
}

/** Proje bazlı özet (Projeler ekranı + dashboard dağılımı). */
export interface ProjectStats {
  project: string;
  repoName: string;
  repoPath: string;
  commits: number;
  backend: number;
  frontend: number;
  additions: number;
  deletions: number;
  lastCommit?: { sha: string; message: string; committedAt: string };
}

/** Güne göre gruplanmış commit listesi (Commitlerim ekranı). */
export interface CommitListDay {
  date: string; // YYYY-MM-DD
  items: CommitRow[];
  commits: number;
  additions: number;
  deletions: number;
}
