// Ortak shell çalıştırıcı.
//
// macOS/Linux'ta GUI uygulamaları minimal bir PATH ile açılır; kullanıcının kabuk
// PATH'indeki `~/.local/bin`, `/opt/homebrew/bin` gibi dizinler görünmez. Bu yüzden
// `claude`/`gh` gibi araçlar "bulunamadı" hatası verir. Buradaki helper, komutları
// genişletilmiş bir PATH ile çalıştırır.
import { Command, type ChildProcess } from "@tauri-apps/plugin-shell";
import { homeDir, join } from "@tauri-apps/api/path";
import { getLogger } from "./logger";

const log = getLogger("shell");

let cachedPath: string | null = null;

/** Yaygın kullanıcı/sistem bin dizinlerini içeren genişletilmiş PATH üretir. */
async function extendedPath(): Promise<string> {
  if (cachedPath) return cachedPath;
  const home = await homeDir();
  const dirs = [
    await join(home, ".local", "bin"),
    await join(home, "bin"),
    await join(home, ".cargo", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  // Mevcut PATH varsa sonuna ekle.
  const existing = (typeof process !== "undefined" && process.env?.PATH) || "";
  cachedPath = [...dirs, existing].filter(Boolean).join(":");
  return cachedPath;
}

export interface ExecOptions {
  cwd?: string;
}

/** Allowlist'teki bir komutu genişletilmiş PATH ile çalıştırır. */
export async function execCommand(
  name: string,
  args: string[],
  opts: ExecOptions = {},
): Promise<ChildProcess<string>> {
  const PATH = await extendedPath();
  try {
    return await Command.create(name, args, { ...opts, env: { PATH } }).execute();
  } catch (err) {
    const detail = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    log.error(`Komut çalıştırılamadı: ${name}`, err);
    throw new Error(`'${name}' komutu çalıştırılamadı: ${detail}`);
  }
}
