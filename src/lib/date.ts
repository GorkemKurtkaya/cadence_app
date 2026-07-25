import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

/** Bir Date'i yerel `YYYY-MM-DD` anahtarına çevirir. */
export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Bugünün `YYYY-MM-DD` anahtarı (yerel saat). */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** `YYYY-MM-DD` anahtarını Türkçe okunur biçime çevirir (örn. "24 Temmuz 2026, Cuma"). */
export function formatDateLong(dateKey: string): string {
  try {
    return format(parseISO(dateKey), "d MMMM yyyy, EEEE", { locale: tr });
  } catch {
    return dateKey;
  }
}
