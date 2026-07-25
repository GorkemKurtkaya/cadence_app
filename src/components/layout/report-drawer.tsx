import { useState } from "react";
import { toast } from "sonner";
import { X, Sparkles, RefreshCw, Copy } from "lucide-react";
import { useAppStore } from "@/stores/use-app-store";
import { useReport, useGenerateReport } from "@/hooks/queries/use-reports";
import { todayKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ProgressStep } from "@/services/reportGenerator";
import type { DailyReport, ReportLength, ReportPeriod } from "@/types";

const PERIODS: Array<{ value: ReportPeriod; label: string }> = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

const LENGTHS: Array<{ value: ReportLength; label: string }> = [
  { value: "short", label: "Kısa" },
  { value: "medium", label: "Orta" },
  { value: "detailed", label: "Detaylı" },
];

function progressLabel(step: ProgressStep): string {
  switch (step.kind) {
    case "scan":
      return `Taranıyor: ${step.repoName}`;
    case "github":
      return "GitHub commit'leri çekiliyor…";
    case "claude":
      return "Claude rapor yazıyor…";
    case "save":
      return "Kaydediliyor…";
  }
}

/** Bir raporu tam markdown metnine (bölüm başlıklarıyla) çevirir. */
function reportToMarkdown(r: DailyReport): string {
  return [
    r.summaryMd && `# Özet\n\n${r.summaryMd}`,
    r.standupMd && `# Standup\n\n${r.standupMd}`,
    r.technicalMd && `# Teknik\n\n${r.technicalMd}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const chip =
  "rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors cursor-pointer";
const chipActive = "border-[#274d34] bg-[#1b2f22] text-accent-green";
const chipIdle = "bg-muted text-muted-foreground hover:text-foreground";

export function ReportDrawer() {
  const date = todayKey();
  const open = useAppStore((s) => s.drawerOpen);
  const close = useAppStore((s) => s.closeDrawer);
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const length = useAppStore((s) => s.reportLength);
  const setLength = useAppStore((s) => s.setReportLength);
  const tone = useAppStore((s) => s.reportTone);
  const setTone = useAppStore((s) => s.setReportTone);

  const { data: report } = useReport(date);
  const generate = useGenerateReport();
  const [progress, setProgress] = useState<string | null>(null);

  if (!open) return null;

  const onGenerate = () => {
    setProgress("Başlıyor…");
    generate.mutate(
      {
        date,
        onProgress: (step) => setProgress(progressLabel(step)),
        options: { period, length, tone },
      },
      {
        onSuccess: ({ commitCount }) => {
          setProgress(null);
          toast.success(
            commitCount > 0 ? `Rapor hazır — ${commitCount} commit.` : "Bugün commit bulunamadı.",
          );
        },
        onError: (err) => {
          setProgress(null);
          toast.error(err instanceof Error ? err.message : "Rapor üretilemedi.");
        },
      },
    );
  };

  const busy = generate.isPending;
  const preview = report?.summaryMd?.trim();

  return (
    <aside className="bg-sidebar flex w-80 shrink-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-4.5 py-4">
        <div className="text-foreground text-[14.5px] font-semibold">Rapor Üret</div>
        <button type="button" onClick={close} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 border-b px-4.5 py-4">
        <Field label="Periyot">
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={cn(chip, period === p.value ? chipActive : chipIdle)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Uzunluk">
          <div className="flex gap-1.5">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                className={cn(chip, "flex-1 text-center", length === l.value ? chipActive : chipIdle)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ton">
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="bg-muted focus:ring-ring w-full rounded-md border px-3 py-2 text-[12.5px] outline-none focus:ring-1"
            placeholder="Kendi ağzımdan, samimi"
          />
        </Field>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4.5 py-4">
        <div className="text-muted-foreground mb-2.5 flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase">
          Önizleme
          {busy ? (
            <span className="bg-accent-green size-1.5 rounded-full [animation:blink_1s_infinite]" />
          ) : null}
        </div>
        {busy ? (
          <div className="text-muted-foreground text-[12.5px]">{progress}</div>
        ) : preview ? (
          <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#b9c0ca]">
            {preview}
          </div>
        ) : (
          <div className="text-muted-foreground text-[12.5px] leading-relaxed">
            Bugüne ait rapor yok. Seçimlerini yapıp{" "}
            <span className="text-accent-green">Üret</span>'e bas.
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t px-4.5 py-3.5">
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="bg-accent-green flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold text-[#08160d] disabled:opacity-60"
        >
          {busy ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {report ? "Yeniden Üret" : "Üret"}
        </button>
        {report ? (
          <>
            <DrawerCopy label="Kopyala" text={report.summaryMd} />
            <DrawerCopy label=".md" text={reportToMarkdown(report)} />
          </>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wider uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

function DrawerCopy({ label, text }: { label: string; text: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Kopyalandı");
      }}
      disabled={!text}
      className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold disabled:opacity-50"
    >
      <Copy className="size-3.5" />
      {label}
    </button>
  );
}
