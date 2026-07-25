// Commit çekme (tarama) için zaman aralığı preset'leri ve aralık dönüşümü.
// Hem Commitler ekranı hem de Dashboard onboarding sihirbazı buradan besleniyor.
import { addDays, format, parseISO } from "date-fns";

/** "Commitlerimi Çek" süre seçenekleri. */
export const PULL_PRESETS = [
  { label: "Son 7 gün", days: 7 },
  { label: "Son 30 gün", days: 30 },
  { label: "Son 90 gün", days: 90 },
  { label: "Son 1 yıl", days: 365 },
  { label: "Tüm geçmiş", days: "all" },
] as const;

export type PullPreset = (typeof PULL_PRESETS)[number];

/** Tarihi gün cinsinden kaydırır (YYYY-MM-DD). */
export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export interface PresetRange {
  /** Tarama başlangıcı; `null` → tüm geçmiş (git log --since verilmez). */
  scanFrom: string | null;
  /** Liste sorgusu için görünen alt sınır ("Tüm geçmiş" → erken sabit tarih). */
  displayFrom: string;
  /** Bitiş (genelde bugün). */
  to: string;
}

/** Preset'i (scanFrom, displayFrom, to) aralığına çevirir. `to` genelde bugünün YYYY-MM-DD'i. */
export function presetToRange(preset: PullPreset, today: string): PresetRange {
  if (preset.days === "all") {
    // "Tüm geçmiş" için erken sabit tarih; getCommitsByRange string BETWEEN ile çalışır.
    return { scanFrom: null, displayFrom: "2000-01-01", to: today };
  }
  const from = shiftDate(today, -preset.days);
  return { scanFrom: from, displayFrom: from, to: today };
}
