// SQLite bağlantısı (plugin-sql). Şema, Rust tarafındaki migration ile kurulur.
import Database from "@tauri-apps/plugin-sql";
import { getLogger } from "./logger";

const log = getLogger("db");
const DB_URL = "sqlite:cadence.db";

let dbPromise: Promise<Database> | null = null;

/** Tek paylaşılan veritabanı bağlantısını döner (lazy). */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    log.info("SQLite bağlantısı açılıyor", DB_URL);
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}
