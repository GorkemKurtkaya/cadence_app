import type { CommitArea } from "@/types";

// Frontend / Backend sınıflandırması için uzantı ve yol ipuçları.
const FE_EXT = /\.(tsx|jsx|vue|svelte|css|scss|sass|less|html|astro)$/i;
const BE_EXT = /\.(py|go|rb|php|java|rs|kt|cs|sql|ex|exs|scala|clj)$/i;

const FE_HINT = /(^|\/)(components?|pages?|views?|ui|frontend|front|web|screens?|widgets?)(\/|$)/i;
const BE_HINT =
  /(^|\/)(api|server|backend|back|controllers?|routes?|handlers?|models?|migrations?|repositor(y|ies)|jobs?|workers?)(\/|$)/i;

/** Tek bir dosya yolunu 'fe' | 'be' | null olarak sınıflar. */
function classifyFile(path: string): "fe" | "be" | null {
  if (FE_EXT.test(path)) return "fe";
  if (BE_EXT.test(path)) return "be";
  // Uzantı belirsiz (.ts, .js, .json…): yol ipucuna bak.
  if (BE_HINT.test(path)) return "be";
  if (FE_HINT.test(path)) return "fe";
  return null;
}

/**
 * Bir commit'in dosya yollarından çalışma alanını (be/fe/other) türetir.
 * Baskın sınıf kazanır; belirlenemezse "other". Saf fonksiyon — test edilir.
 */
export function deriveArea(paths: string[]): CommitArea {
  let fe = 0;
  let be = 0;
  for (const p of paths) {
    const c = classifyFile(p);
    if (c === "fe") fe++;
    else if (c === "be") be++;
  }
  if (fe > be) return "fe";
  if (be > fe) return "be";
  return "other";
}
