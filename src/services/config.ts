// Merkezi ayar erişimi — uygulamanın TEK ayar kaynağı.
// Non-secret ayarlar plugin-store'da (`settings.json`), sırlar ayrı anahtarlarda tutulur.
//
// NOT (güvenlik): Sırlar (GitHub token / Anthropic API key) şu an plugin-store'da düz saklanıyor.
// MVP sonrası OS keychain'e (stronghold / keyring) taşınmalı — swap noktası: getSecret/setSecret.

import { load, type Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types";
import { getLogger } from "./logger";

const log = getLogger("config");

const SETTINGS_KEY = "app_settings";
const SECRET_KEYS = {
  anthropicApiKey: "secret_anthropic_api_key",
  githubToken: "secret_github_token",
} as const;

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("settings.json", { autoSave: true });
  }
  return storePromise;
}

/** Tüm uygulama ayarlarını okur (varsayılanlarla birleştirir). */
export async function getSettings(): Promise<AppSettings> {
  try {
    const store = await getStore();
    const saved = await store.get<Partial<AppSettings>>(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  } catch (err) {
    log.error("Ayarlar okunamadı, varsayılan kullanılıyor", err);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Ayarları (kısmi) günceller ve kalıcı kaydeder. */
export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const store = await getStore();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await store.set(SETTINGS_KEY, next);
  await store.save();
  log.info("Ayarlar güncellendi");
  return next;
}

type SecretName = keyof typeof SECRET_KEYS;

/** Bir sırrı okur (yoksa boş string). Değer asla log'lanmaz. */
export async function getSecret(name: SecretName): Promise<string> {
  const store = await getStore();
  const value = await store.get<string>(SECRET_KEYS[name]);
  return value ?? "";
}

/** Bir sırrı kaydeder. Değer asla log'lanmaz. */
export async function setSecret(name: SecretName, value: string): Promise<void> {
  const store = await getStore();
  await store.set(SECRET_KEYS[name], value);
  await store.save();
  log.info(`Sır güncellendi: ${name}`);
}
