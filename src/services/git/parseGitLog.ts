import type { FileChange, ParsedCommit } from "@/types";

/**
 * `parseGitLog` için beklenen git komutu:
 *
 *   git log ... --numstat \
 *     --pretty=format:'%x1eCMT%x1f%H%x1f%aI%x1f%an%x1f%s%x1f%b%x1d'
 *
 * Ayraçlar:
 * - `\x1e` (record separator): her commit'in başı
 * - `\x1f` (unit separator): meta alanlar arası (sha, tarih, yazar, konu, body)
 * - `\x1d` (group separator): meta bölümünün sonu — bundan sonrası numstat satırları
 *
 * Body çok satırlı olabildiği için meta/numstat ayrımı `\x1d` ile yapılır
 * (satır bazlı değil). Saf fonksiyondur (I/O yok) — bağımsız test edilir.
 */
export function parseGitLog(raw: string): ParsedCommit[] {
  if (!raw || !raw.trim()) return [];

  const records = raw.split("\x1e").filter((r) => r.includes("CMT\x1f"));
  const commits: ParsedCommit[] = [];

  for (const record of records) {
    const gsIdx = record.indexOf("\x1d");
    const metaPart = gsIdx >= 0 ? record.slice(0, gsIdx) : record;
    const numstatPart = gsIdx >= 0 ? record.slice(gsIdx + 1) : "";

    const fields = metaPart.split("\x1f");
    if (fields[0] !== "CMT" || !fields[1]) continue;
    const [, sha, committedAt, author, subject, body] = fields;

    const files: FileChange[] = [];
    for (const line of numstatPart.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split("\t");
      if (parts.length < 3) continue;
      const [addStr, delStr, ...pathParts] = parts;
      // numstat olmayan satırları (beklenmedik) ele: ekleme/silme sayısal ya da "-" olmalı
      if (!/^(\d+|-)$/.test(addStr) || !/^(\d+|-)$/.test(delStr)) continue;
      files.push({
        file: pathParts.join("\t"),
        additions: addStr === "-" ? 0 : Number.parseInt(addStr, 10) || 0,
        deletions: delStr === "-" ? 0 : Number.parseInt(delStr, 10) || 0,
      });
    }

    const additions = files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

    commits.push({
      sha,
      committedAt: committedAt ?? "",
      author: author ?? "",
      message: subject ?? "",
      body: (body ?? "").trim(),
      files,
      additions,
      deletions,
      filesChanged: files.length,
    });
  }

  return commits;
}

/** git log için pretty-format argümanı (tek kaynak) — subject + body dahil. */
export const GIT_LOG_FORMAT = "--pretty=format:%x1eCMT%x1f%H%x1f%aI%x1f%an%x1f%s%x1f%b%x1d";

/** Bir commit'in dosya değişimlerinden kısa, okunur bir özet üretir. */
export function summarizeFiles(files: FileChange[], max = 20): string {
  if (files.length === 0) return "(dosya değişimi yok)";
  const shown = files.slice(0, max);
  const lines = shown.map((f) => `  ${f.file} (+${f.additions} / -${f.deletions})`);
  if (files.length > max) lines.push(`  … ve ${files.length - max} dosya daha`);
  return lines.join("\n");
}

/**
 * `summarizeFiles` çıktısından dosya yollarını geri ayrıştırır (chip/alan türetme için).
 * "… ve N dosya daha" gibi bilgi satırlarını atlar. Saf fonksiyon — test edilir.
 */
export function parseSummaryPaths(diffSummary: string | null | undefined): string[] {
  if (!diffSummary) return [];
  const paths: string[] = [];
  for (const line of diffSummary.split("\n")) {
    const m = /^\s*(.+?)\s*\(\+\d+\s*\/\s*-\d+\)\s*$/.exec(line);
    if (m) paths.push(m[1]);
  }
  return paths;
}
