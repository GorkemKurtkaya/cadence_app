import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/hooks/queries/use-reports";
import type { DailyReport, ReportLength, ReportPeriod } from "@/types";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};
const LENGTH_LABEL: Record<ReportLength, string> = {
  short: "kısa",
  medium: "orta",
  detailed: "detaylı",
};

/** Rapor özetinin ilk anlamlı satırından kısa kesit. */
function snippetOf(r: DailyReport): string {
  const line = (r.summaryMd || r.standupMd || r.technicalMd || "")
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .find((l) => l.length > 0);
  return line ?? "(içerik yok)";
}

export function HistoryPage() {
  const { data: reports, isLoading, isError, error } = useReports();

  return (
    <div className="flex flex-col gap-3 p-6">
      {isError ? (
        <ErrorAlert message={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <HistoryListSkeleton />
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={<ScrollText />}
          title="Henüz kayıtlı rapor yok"
          description="Sağ üstten Rapor Üret ile ilk raporunu oluştur; burada birikecek."
        />
      ) : (
        reports.map((r) => <ReportRow key={r.reportDate} report={r} />)
      )}
    </div>
  );
}

function ReportRow({ report: r }: { report: DailyReport }) {
  const [, m, d] = r.reportDate.split("-");
  const copyMd = async () => {
    const md = [
      r.summaryMd && `# Özet\n\n${r.summaryMd}`,
      r.standupMd && `# Standup\n\n${r.standupMd}`,
      r.technicalMd && `# Teknik\n\n${r.technicalMd}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    await navigator.clipboard.writeText(md);
    toast.success("Markdown kopyalandı");
  };

  return (
    <div className="bg-panel flex items-center gap-4.5 rounded-xl border px-5 py-4">
      <div className="shrink-0 text-center">
        <div className="text-foreground font-mono text-xl font-bold">{Number(d)}</div>
        <div className="text-muted-foreground font-mono text-[11px]">{MONTHS[Number(m) - 1]}</div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-accent-green rounded-full bg-[#152318] px-2.5 py-0.5 font-mono text-[11px]">
            {PERIOD_LABEL[r.period ?? "daily"]}
          </span>
          <span className="rounded-full bg-[#1b222a] px-2.5 py-0.5 text-[11px] text-[#8b93a0]">
            {LENGTH_LABEL[r.length ?? "detailed"]}
          </span>
          {r.model && r.model !== "-" ? (
            <span className="text-muted-foreground text-[11px]">
              {r.mode} · {r.model}
            </span>
          ) : null}
        </div>
        <div className="truncate text-[13px] leading-snug text-[#cfd4dc]">{snippetOf(r)}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          to="/report/$date"
          params={{ date: r.reportDate }}
          className="text-secondary-foreground bg-[#1b222a] rounded-md px-3 py-2 text-xs font-semibold"
        >
          Görüntüle
        </Link>
        <button
          type="button"
          onClick={copyMd}
          className="text-secondary-foreground bg-[#1b222a] rounded-md px-2.5 py-2 text-xs font-semibold"
        >
          .md
        </button>
      </div>
    </div>
  );
}

export function HistoryListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  );
}
