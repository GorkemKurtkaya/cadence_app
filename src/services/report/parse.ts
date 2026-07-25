import { SECTION_MARKERS } from "./prompt";

export interface ReportSections {
  summaryMd: string;
  standupMd: string;
  technicalMd: string;
}

/**
 * Claude'un işaretçili çıktısını 3 bölüme ayırır. İşaretçi bulunamazsa,
 * tüm metni özet bölümüne koyar (bozuk çıktıya karşı güvenli).
 * Saf fonksiyondur — test edilir.
 */
export function parseReportSections(raw: string): ReportSections {
  const text = (raw ?? "").trim();
  const { summary, standup, technical } = SECTION_MARKERS;

  const iSummary = text.indexOf(summary);
  const iStandup = text.indexOf(standup);
  const iTechnical = text.indexOf(technical);

  // Hiç işaretçi yoksa: her şey özete.
  if (iSummary === -1 && iStandup === -1 && iTechnical === -1) {
    return { summaryMd: text, standupMd: "", technicalMd: "" };
  }

  const slice = (start: number, marker: string, ...ends: number[]) => {
    if (start === -1) return "";
    const from = start + marker.length;
    const validEnds = ends.filter((e) => e > start);
    const to = validEnds.length ? Math.min(...validEnds) : text.length;
    return text.slice(from, to).trim();
  };

  return {
    summaryMd: slice(iSummary, summary, iStandup, iTechnical),
    standupMd: slice(iStandup, standup, iTechnical, iSummary > iStandup ? iSummary : -1),
    technicalMd: slice(iTechnical, technical, iSummary > iTechnical ? iSummary : -1, iStandup > iTechnical ? iStandup : -1),
  };
}
