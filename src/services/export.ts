// Commit'leri diske JSON olarak yazma — sistem erişimi (dosya/dialog) servis katmanında.
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { getLogger } from "./logger";
import type { CommitRow } from "@/types";

const log = getLogger("export");

/** JSON dosyasının üst düzey şeması — commit listesi + kısa meta. */
export interface CommitExport {
  exportedAt: string;
  count: number;
  commits: CommitRow[];
}

/**
 * Verilen commit'leri native "Farklı Kaydet" penceresiyle JSON olarak diske yazar.
 * @param commits Dışa aktarılacak commit satırları.
 * @param suggestedName Önerilen dosya adı (kullanıcı değiştirebilir).
 * @returns Kaydedilen dosyanın yolu; kullanıcı iptal ederse null.
 */
export async function exportCommitsJson(
  commits: CommitRow[],
  suggestedName: string,
): Promise<string | null> {
  try {
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return null; // kullanıcı iptal etti

    const payload: CommitExport = {
      exportedAt: new Date().toISOString(),
      count: commits.length,
      commits,
    };
    await writeTextFile(path, JSON.stringify(payload, null, 2));
    log.info("Commit JSON dışa aktarıldı", { path, count: commits.length });
    return path;
  } catch (err) {
    log.error("Commit JSON dışa aktarılamadı", err);
    throw err instanceof Error ? err : new Error("Dışa aktarım başarısız");
  }
}
