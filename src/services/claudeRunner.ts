// Claude'a iki yoldan bağlanır: yerel `claude` CLI (varsayılan) veya Anthropic API.
import Anthropic from "@anthropic-ai/sdk";
import { execCommand } from "./shell";
import { getLogger } from "./logger";
import { getSecret, getSettings } from "./config";
import type { ClaudeMode } from "@/types";

const log = getLogger("claudeRunner");

export interface ClaudeResult {
  text: string;
  model: string;
  mode: ClaudeMode;
}

/** Yerel `claude` CLI'ı print modunda çalıştırır. */
async function runViaCli(prompt: string): Promise<string> {
  log.info("Claude CLI çağrılıyor (claude -p)");
  const out = await execCommand("claude", ["-p", prompt]);
  if (out.code !== 0) {
    throw new Error(`claude CLI hata kodu ${out.code}: ${out.stderr.slice(0, 500)}`);
  }
  return out.stdout.trim();
}

/** Anthropic API üzerinden çağırır (webview → dangerouslyAllowBrowser gerekli). */
async function runViaApi(prompt: string, model: string): Promise<string> {
  const apiKey = await getSecret("anthropicApiKey");
  if (!apiKey) {
    throw new Error("Anthropic API anahtarı ayarlı değil (Ayarlar → API anahtarı).");
  }
  log.info(`Anthropic API çağrılıyor (model: ${model})`);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const res = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Ayarlardaki moda göre prompt'u Claude'a yollar ve metni döner.
 * Mod/model tek kaynaktan (config) okunur.
 */
export async function runClaude(prompt: string): Promise<ClaudeResult> {
  const settings = await getSettings();
  const mode = settings.claudeMode;
  const model = settings.model;

  const text = mode === "api" ? await runViaApi(prompt, model) : await runViaCli(prompt);
  if (!text) throw new Error("Claude boş yanıt döndü.");

  return { text, model, mode };
}

/** CLI erişilebilir mi (Ayarlar'da durum göstermek için). */
export async function checkCliAvailable(): Promise<boolean> {
  try {
    const out = await execCommand("claude", ["--version"]);
    return out.code === 0;
  } catch {
    return false;
  }
}
