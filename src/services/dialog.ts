// Native dosya/klasör seçici — sistem erişimi olduğu için servis katmanında.
import { open } from "@tauri-apps/plugin-dialog";
import { getLogger } from "./logger";

const log = getLogger("dialog");

/**
 * Native klasör seçici penceresi açar; seçilen klasörün yolunu döner (iptal → null).
 * Repo kökü seçmek için kullanılır (kullanıcı elle yol yazmaz).
 */
export async function pickDirectory(): Promise<string | null> {
  try {
    const selected = await open({ directory: true, multiple: false });
    // multiple:false → string | null döner.
    return typeof selected === "string" ? selected : null;
  } catch (err) {
    log.error("Klasör seçici açılamadı", err);
    return null;
  }
}
