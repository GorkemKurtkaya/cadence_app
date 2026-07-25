// Yereldeki git repolarını tarar ve belirli günün commit'lerini çeker.
import { readDir } from "@tauri-apps/plugin-fs";
import { join, basename } from "@tauri-apps/api/path";
import { execCommand } from "./shell";
import { getLogger } from "./logger";
import { GIT_LOG_FORMAT, parseGitLog, summarizeFiles } from "./git/parseGitLog";
import { deriveProject } from "./git/project";
import type { CommitInfo, Repo } from "@/types";

const log = getLogger("repoScanner");

// Tarama sırasında girilmeyecek ağır/gereksiz klasörler.
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".cache",
  "vendor",
  "Pods",
]);

/**
 * Verilen kök klasörlerin altında (sınırlı derinlikte) `.git` içeren dizinleri bulur.
 * `.git` bulununca o dala daha inilmez (iç içe repo taraması yapılmaz).
 */
export async function findGitRepos(roots: string[], maxDepth = 3): Promise<Repo[]> {
  const found: Repo[] = [];
  const seen = new Set<string>();

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readDir(dir);
    } catch (err) {
      log.warn(`Klasör okunamadı, atlanıyor: ${dir}`, err);
      return;
    }

    const hasGit = entries.some((e) => e.isDirectory && e.name === ".git");
    if (hasGit) {
      if (!seen.has(dir)) {
        seen.add(dir);
        const remote = await getRemote(dir);
        found.push({ path: dir, name: await basename(dir), remote, active: true });
      }
      return; // repo kökünde dur
    }

    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      if (entry.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(await join(dir, entry.name), depth + 1);
    }
  }

  for (const root of roots) {
    await walk(root, 0);
  }

  log.info(`${found.length} repo bulundu`);
  return found;
}

/** Reponun origin remote URL'sini döner (yoksa null). */
async function getRemote(repoPath: string): Promise<string | null> {
  try {
    const out = await execCommand("git", ["remote", "get-url", "origin"], {
      cwd: repoPath,
    });
    return out.code === 0 ? out.stdout.trim() || null : null;
  } catch {
    return null;
  }
}

export interface ScanOptions {
  /** Tüm branch'leri tara (sadece checkout'lu HEAD değil). */
  allBranches: boolean;
  /** Yalnızca reponun git email'iyle atılan commit'ler (takım arkadaşlarını dışla). */
  onlyMine: boolean;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = { allBranches: true, onlyMine: true };

/** Reponun yapılandırılmış git kullanıcı email'ini döner (yoksa null). */
async function getGitEmail(repoPath: string): Promise<string | null> {
  try {
    const out = await execCommand("git", ["config", "user.email"], { cwd: repoPath });
    return out.code === 0 ? out.stdout.trim() || null : null;
  } catch {
    return null;
  }
}

/** `YYYY-MM-DD` için o günün commit'lerini tek bir repodan çeker. */
export async function getCommitsForDate(
  repo: Repo,
  date: string,
  options: ScanOptions = DEFAULT_SCAN_OPTIONS,
): Promise<CommitInfo[]> {
  const since = `${date} 00:00:00`;
  const until = `${date} 23:59:59`;

  const args = ["log", `--since=${since}`, `--until=${until}`, "--date=iso-strict", "--numstat", "--no-merges"];
  // Tüm branch'ler: feature/PR branch'lerindeki commit'ler de görünür.
  if (options.allBranches) args.push("--all");
  // Sadece benim commit'lerim: reponun git email'iyle filtrele (paylaşılan repolarda ekip commitlerini dışla).
  if (options.onlyMine) {
    const email = await getGitEmail(repo.path);
    if (email) args.push(`--author=${email}`);
  }
  args.push(GIT_LOG_FORMAT);

  let out;
  try {
    out = await execCommand("git", args, { cwd: repo.path });
  } catch (err) {
    log.error(`git log çalıştırılamadı: ${repo.path}`, err);
    return [];
  }

  if (out.code !== 0) {
    log.warn(`git log hata kodu ${out.code}: ${repo.path}`, out.stderr);
    return [];
  }

  const { project, layer } = deriveProject(repo.name);
  return parseGitLog(out.stdout).map((c) => ({
    ...c,
    repoName: repo.name,
    repoPath: repo.path,
    project,
    layer,
    source: "local" as const,
    diffSummary: summarizeFiles(c.files),
  }));
}

/**
 * Belirli günün TÜM yerel commit'lerini tarar: kökleri gez → repoları bul → her repodan çek.
 * `onRepo` geri çağrısı ilerleme göstermek için opsiyoneldir.
 */
export async function scanLocalCommits(
  repoRoots: string[],
  date: string,
  onRepo?: (repoName: string) => void,
  options: ScanOptions = DEFAULT_SCAN_OPTIONS,
): Promise<{ repos: Repo[]; commits: CommitInfo[] }> {
  const repos = await findGitRepos(repoRoots);
  const all: CommitInfo[] = [];

  for (const repo of repos) {
    onRepo?.(repo.name);
    const commits = await getCommitsForDate(repo, date, options);
    all.push(...commits);
  }

  all.sort((a, b) => a.committedAt.localeCompare(b.committedAt));
  log.info(`${date} için ${all.length} yerel commit bulundu`);
  return { repos, commits: all };
}
