// SQLite CRUD katmanı — commit ve rapor geçmişi.
import { getDb } from "./db";
import { getLogger } from "./logger";
import { getSettings } from "./config";
import { deriveProject } from "./git/project";
import { deriveArea } from "./git/area";
import { parseSummaryPaths } from "./git/parseGitLog";
import type {
  CommitInfo,
  CommitRow,
  DailyReport,
  ReportLength,
  ReportPeriod,
  Repo,
} from "@/types";

const log = getLogger("storage");

/** DB satırını (diff_summary dahil) zenginleştirilmiş CommitRow'a çevirir. */
function rowToCommitRow(r: Record<string, unknown>, aliases?: Record<string, string>): CommitRow {
  const repoName = String(r.repo_name ?? "?");
  const paths = parseSummaryPaths(r.diff_summary as string | null);
  return {
    sha: String(r.sha),
    committedAt: String(r.committed_at),
    author: (r.author as string) ?? "",
    message: String(r.message),
    body: (r.body as string) ?? "",
    filesChanged: Number(r.files_changed),
    additions: Number(r.additions),
    deletions: Number(r.deletions),
    source: (r.source as CommitRow["source"]) ?? "local",
    repoName,
    project: deriveProject(repoName, aliases).project,
    area: deriveArea(paths),
    paths,
  };
}

const COMMIT_SELECT = `SELECT c.sha, c.committed_at, c.author, c.message, c.body, c.files_changed,
        c.additions, c.deletions, c.diff_summary, c.source, COALESCE(r.name, '?') AS repo_name
 FROM commits c LEFT JOIN repos r ON r.id = c.repo_id`;

// ---- Repos ----

/** Repoyu ekler ya da yolu üzerinden günceller; id döner. */
export async function upsertRepo(repo: Repo): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO repos (path, name, remote, active) VALUES ($1, $2, $3, $4)
     ON CONFLICT(path) DO UPDATE SET name = excluded.name, remote = excluded.remote, active = excluded.active`,
    [repo.path, repo.name, repo.remote ?? null, repo.active ? 1 : 0],
  );
}

export async function listRepos(): Promise<Repo[]> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `SELECT id, path, name, remote, active FROM repos ORDER BY name`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    path: String(r.path),
    name: String(r.name),
    remote: (r.remote as string) ?? null,
    active: Number(r.active) === 1,
  }));
}

// ---- Commits ----

/**
 * Günün commit'lerini kaydeder. (sha, source) tekil olduğundan tekrarlar sessizce atlanır.
 * repo_id'yi yola göre çözer.
 */
export async function saveCommits(commits: CommitInfo[]): Promise<number> {
  if (commits.length === 0) return 0;
  const db = await getDb();
  let saved = 0;

  for (const c of commits) {
    const repoRows = await db.select<Array<{ id: number }>>(
      `SELECT id FROM repos WHERE path = $1 LIMIT 1`,
      [c.repoPath],
    );
    const repoId = repoRows[0]?.id ?? null;

    const res = await db.execute(
      `INSERT INTO commits
       (repo_id, sha, committed_at, author, message, body, files_changed, additions, deletions, diff_summary, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(sha, source) DO UPDATE SET
         message = excluded.message,
         body = excluded.body,
         files_changed = excluded.files_changed,
         additions = excluded.additions,
         deletions = excluded.deletions,
         diff_summary = excluded.diff_summary`,
      [
        repoId,
        c.sha,
        c.committedAt,
        c.author,
        c.message,
        c.body,
        c.filesChanged,
        c.additions,
        c.deletions,
        c.diffSummary,
        c.source,
      ],
    );
    saved += res.rowsAffected;
  }

  log.info(`${saved}/${commits.length} commit kaydedildi`);
  return saved;
}

/** Belirli günün (YYYY-MM-DD) kayıtlı commit'lerini repo adıyla döner. */
export async function getCommitsByDate(date: string): Promise<CommitRow[]> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `${COMMIT_SELECT}
     WHERE substr(c.committed_at, 1, 10) = $1
     ORDER BY c.committed_at ASC`,
    [date],
  );
  const { projectAliases } = await getSettings();
  return rows.map((r) => rowToCommitRow(r, projectAliases));
}

/** Bir tarih aralığındaki (from..to, dahil) commit'leri döner. */
export async function getCommitsByRange(from: string, to: string): Promise<CommitRow[]> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `${COMMIT_SELECT}
     WHERE substr(c.committed_at, 1, 10) BETWEEN $1 AND $2
     ORDER BY c.committed_at DESC`,
    [from, to],
  );
  const { projectAliases } = await getSettings();
  return rows.map((r) => rowToCommitRow(r, projectAliases));
}

/** En son N commit'i (yeni→eski) döner — dashboard feed'i için. */
export async function getRecentCommits(limit = 6): Promise<CommitRow[]> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `${COMMIT_SELECT}
     ORDER BY c.committed_at DESC
     LIMIT $1`,
    [limit],
  );
  const { projectAliases } = await getSettings();
  return rows.map((r) => rowToCommitRow(r, projectAliases));
}

// ---- Reports ----

/** Günlük raporu ekler ya da (aynı tarihte) günceller. */
export async function saveReport(report: DailyReport): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO reports
       (report_date, summary_md, standup_md, technical_md, model, mode, created_at, period, length, tone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(report_date) DO UPDATE SET
       summary_md = excluded.summary_md,
       standup_md = excluded.standup_md,
       technical_md = excluded.technical_md,
       model = excluded.model,
       mode = excluded.mode,
       created_at = excluded.created_at,
       period = excluded.period,
       length = excluded.length,
       tone = excluded.tone`,
    [
      report.reportDate,
      report.summaryMd,
      report.standupMd,
      report.technicalMd,
      report.model,
      report.mode,
      report.createdAt,
      report.period ?? "daily",
      report.length ?? "detailed",
      report.tone ?? "",
    ],
  );
  log.info(`Rapor kaydedildi: ${report.reportDate}`);
}

function rowToReport(r: Record<string, unknown>): DailyReport {
  return {
    reportDate: String(r.report_date),
    summaryMd: (r.summary_md as string) ?? "",
    standupMd: (r.standup_md as string) ?? "",
    technicalMd: (r.technical_md as string) ?? "",
    model: (r.model as string) ?? "",
    mode: (r.mode as DailyReport["mode"]) ?? "cli",
    createdAt: String(r.created_at),
    period: (r.period as ReportPeriod) ?? "daily",
    length: (r.length as ReportLength) ?? "detailed",
    tone: (r.tone as string) ?? "",
  };
}

/** Belirli günün raporunu döner (yoksa null). */
export async function getReport(reportDate: string): Promise<DailyReport | null> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `SELECT * FROM reports WHERE report_date = $1 LIMIT 1`,
    [reportDate],
  );
  return rows[0] ? rowToReport(rows[0]) : null;
}

/** Rapor tarihlerini (yeni→eski) döner — geçmiş listesi için. */
export async function listReportDates(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<Array<{ report_date: string }>>(
    `SELECT report_date FROM reports ORDER BY report_date DESC`,
  );
  return rows.map((r) => r.report_date);
}

/** Tüm raporları meta verisiyle (yeni→eski) döner — Rapor Geçmişi ekranı. */
export async function listReports(): Promise<DailyReport[]> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `SELECT * FROM reports ORDER BY report_date DESC`,
  );
  return rows.map(rowToReport);
}
