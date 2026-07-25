// GitHub'daki (başka cihazlardan atılmış olabilecek) günlük commit'leri çeker.
// Öncelik: `gh` CLI (kuruluysa auth hazırdır). Her hata durumunda boş liste döner —
// GitHub entegrasyonu opsiyoneldir, uygulamayı bloklamaz.
import { execCommand } from "./shell";
import { getLogger } from "./logger";
import { getSettings } from "./config";
import { deriveProject } from "./git/project";
import type { CommitInfo } from "@/types";

const log = getLogger("githubConnector");

interface GhSearchItem {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  repository: { name: string; full_name: string };
}

/** `gh` CLI erişilebilir ve authenticated mi. */
export async function checkGhAvailable(): Promise<boolean> {
  try {
    const out = await execCommand("gh", ["auth", "status"]);
    return out.code === 0;
  } catch {
    return false;
  }
}

/**
 * Verilen gün için kullanıcının GitHub commit'lerini çeker (search/commits API).
 * Ayarlarda GitHub kapalıysa veya kullanıcı adı yoksa boş döner.
 */
export async function fetchGithubCommits(date: string): Promise<CommitInfo[]> {
  const settings = await getSettings();
  if (!settings.githubEnabled || !settings.githubUsername) return [];

  const q = `author:${settings.githubUsername} committer-date:${date}`;
  try {
    const out = await execCommand("gh", [
      "api",
      "-X",
      "GET",
      "search/commits",
      "-f",
      `q=${q}`,
      "--jq",
      ".items",
    ]);

    if (out.code !== 0) {
      log.warn(`gh api hata kodu ${out.code}`, out.stderr.slice(0, 300));
      return [];
    }

    const items = JSON.parse(out.stdout || "[]") as GhSearchItem[];
    log.info(`GitHub'dan ${items.length} commit alındı`);

    return items.map((it) => {
      const lines = it.commit.message.split("\n");
      const { project, layer } = deriveProject(it.repository.name);
      return {
        sha: it.sha,
        committedAt: it.commit.author.date,
        author: it.commit.author.name,
        message: lines[0],
        body: lines.slice(1).join("\n").trim(),
        files: [],
        additions: 0,
        deletions: 0,
        filesChanged: 0,
        repoName: it.repository.name,
        repoPath: `github:${it.repository.full_name}`,
        project,
        layer,
        source: "github" as const,
        diffSummary: "(GitHub API — dosya detayı yok)",
      };
    });
  } catch (err) {
    log.warn("GitHub commit'leri alınamadı", err);
    return [];
  }
}

/**
 * Yerel ve GitHub commit'lerini birleştirir; aynı sha'yı bir kez tutar (yerel öncelikli).
 */
export function mergeCommits(local: CommitInfo[], github: CommitInfo[]): CommitInfo[] {
  const bySha = new Map<string, CommitInfo>();
  for (const c of local) bySha.set(c.sha, c);
  for (const c of github) if (!bySha.has(c.sha)) bySha.set(c.sha, c);
  return [...bySha.values()].sort((a, b) => a.committedAt.localeCompare(b.committedAt));
}
