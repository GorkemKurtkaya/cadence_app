// Sayı ve zaman biçimlendirme yardımcıları (UI genelinde tutarlı gösterim).

/** Büyük sayıyı kısaltır: 4200 → "4.2k", 980 → "980". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

/** İşaretli kısaltma: 4200 → "+4.2k", -1100 → "−1.1k". */
export function signedCompact(n: number): string {
  const sign = n < 0 ? "−" : "+";
  return `${sign}${formatCompact(Math.abs(n))}`;
}

/** ISO tarihi kısa Türkçe "X önce" biçimine çevirir: "14dk", "3s", "2g". */
export function formatAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  const min = Math.floor(diffSec / 60);
  if (min < 1) return "az önce";
  if (min < 60) return `${min}dk`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}s`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
}

/** ISO tarihten "HH:MM" saati. */
export function clockOf(iso: string): string {
  return iso.slice(11, 16) || "--:--";
}
