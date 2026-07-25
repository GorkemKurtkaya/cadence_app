import type { RepoLayer } from "@/types";

// Repo adı sonundaki katman ekleri (uzun olan önce eşleşsin diye sıralı).
const LAYER_SUFFIXES: Array<{ re: RegExp; layer: RepoLayer }> = [
  { re: /[-_](frontend|front|adminpanel|admin[-_]?front|web|ui|app)$/i, layer: "Frontend" },
  { re: /[-_](backend|back|api|server)$/i, layer: "Backend" },
];

function prettify(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Repo adından proje adı ve katmanı (Backend/Frontend/Diğer) türetir.
 * Örn: "story_app_backend" → { project: "Story App", layer: "Backend" }.
 * Saf fonksiyondur — test edilir.
 */
export function deriveProject(repoName: string): { project: string; layer: RepoLayer } {
  for (const { re, layer } of LAYER_SUFFIXES) {
    if (re.test(repoName)) {
      return { project: prettify(repoName.replace(re, "")), layer };
    }
  }
  // Ek bulunmazsa: içerikte geçse bile katmanı tahmin et, proje = tam ad.
  const lower = repoName.toLowerCase();
  const layer: RepoLayer = lower.includes("front")
    ? "Frontend"
    : lower.includes("back")
      ? "Backend"
      : "Diğer";
  return { project: prettify(repoName), layer };
}
