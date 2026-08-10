import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Sparkles, RefreshCw, Copy, Check, Minus, ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/use-app-store";
import { useReport, useGenerateReport, useCommitsRange } from "@/hooks/queries/use-reports";
import { rangeFor } from "@/services/stats";
import { todayKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ProgressStep } from "@/services/reportGenerator";
import type { CommitRow, DailyReport, ReportLength, ReportPeriod } from "@/types";

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
  const reportProjectScope = useAppStore((s) => s.reportProjectScope);

  // Kapsanan commit'ler seçilen periyodun aralığına göre belirlenir (rapor da aynı aralığı tarar).
  const range = useMemo(() => rangeFor(period, date), [period, date]);
  const { data: report } = useReport(date);
  const { data: rangeCommits } = useCommitsRange(range.from, range.to);
  const generate = useGenerateReport();
  const [progress, setProgress] = useState<string | null>(null);
  const [commitsOpen, setCommitsOpen] = useState(true);
  // Rapor dışı bırakılan commit'ler (opt-out). Boş → o günün hepsi dahil.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const toggleExcluded = (sha: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  // Bir grup (proje) commit'ini topluca dahil et / hariç bırak.
  const setGroupExcluded = (shas: string[], excludedNext: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const s of shas) if (excludedNext) next.add(s);
      else next.delete(s);
      return next;
    });

  // Proje scope'una göre excluded'ı seed'ler; aktivasyon başına tam bir kez (kullanıcı düzenlemesini ezmez).
  const appliedScopeRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!open) {
      appliedScopeRef.current = undefined; // kapanınca sıfırla
      return;
    }
    if (appliedScopeRef.current === reportProjectScope) return; // bu aktivasyon zaten seed'lendi
    if (reportProjectScope == null) {
      setExcluded(new Set()); // generic açılış → tümü dahil
      appliedScopeRef.current = null;
      return;
    }
    if (!rangeCommits) return; // scoped: commit'ler yüklenene kadar bekle
    setExcluded(
      new Set(rangeCommits.filter((c) => c.project !== reportProjectScope).map((c) => c.sha)),
    );
    appliedScopeRef.current = reportProjectScope;
  }, [open, rangeCommits, reportProjectScope]);

  if (!open) return null;

  const onGenerate = () => {
    setProgress("Başlıyor…");
    // Hepsi dahilse selectedShas gönderme (undefined = tümü); aksi halde dahil edilenleri yolla.
    const included = (rangeCommits ?? []).filter((c) => !excluded.has(c.sha)).map((c) => c.sha);
    const selectedShas = excluded.size > 0 ? included : undefined;
    generate.mutate(
      {
        date,
        onProgress: (step) => setProgress(progressLabel(step)),
        options: { period, length, tone, selectedShas },
      },
      {
        onSuccess: ({ commitCount }) => {
          setProgress(null);
          toast.success(
            commitCount > 0
              ? `Rapor hazır — ${commitCount} commit.`
              : "Seçilen aralıkta commit bulunamadı.",
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
        {rangeCommits && rangeCommits.length > 0 ? (
          <CommitPicker
            commits={rangeCommits}
            excluded={excluded}
            onToggle={toggleExcluded}
            onToggleGroup={setGroupExcluded}
            open={commitsOpen}
            onToggleOpen={() => setCommitsOpen((o) => !o)}
          />
        ) : null}

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

/** Rapora girecek commit'leri projeye göre gruplayıp seçtiren opt-out liste (hepsi başta dahil). */
function CommitPicker({
  commits,
  excluded,
  onToggle,
  onToggleGroup,
  open,
  onToggleOpen,
}: {
  commits: CommitRow[];
  excluded: Set<string>;
  onToggle: (sha: string) => void;
  onToggleGroup: (shas: string[], excludedNext: boolean) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  // Commit'leri proje adına göre grupla (proje adına göre stabil sıralı).
  const groups = useMemo(() => {
    const map = new Map<string, CommitRow[]>();
    for (const c of commits) {
      const list = map.get(c.project);
      if (list) list.push(c);
      else map.set(c.project, [c]);
    }
    return [...map.entries()]
      .map(([project, items]) => ({ project, commits: items }))
      .sort((a, b) => a.project.localeCompare(b.project, "tr"));
  }, [commits]);

  const included = commits.length - excluded.size;
  return (
    <div>
      <button
        type="button"
        onClick={onToggleOpen}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        Commitler ({included}/{commits.length})
      </button>
      {open ? (
        <div className="mt-2 flex max-h-64 flex-col gap-2.5 overflow-y-auto">
          {groups.map((g) => (
            <CommitGroup
              key={g.project}
              project={g.project}
              commits={g.commits}
              excluded={excluded}
              onToggle={onToggle}
              onToggleGroup={onToggleGroup}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Tek bir projenin commit'leri: master checkbox (tri-state) + tek tek satırlar. */
function CommitGroup({
  project,
  commits,
  excluded,
  onToggle,
  onToggleGroup,
}: {
  project: string;
  commits: CommitRow[];
  excluded: Set<string>;
  onToggle: (sha: string) => void;
  onToggleGroup: (shas: string[], excludedNext: boolean) => void;
}) {
  const shas = commits.map((c) => c.sha);
  const excludedCount = shas.filter((s) => excluded.has(s)).length;
  const allExcluded = excludedCount === shas.length;
  const noneExcluded = excludedCount === 0;
  const includedInGroup = shas.length - excludedCount;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        // Grup tamamen dahilse hariç bırak; aksi halde (partial/hiç) tümünü dahil et.
        onClick={() => onToggleGroup(shas, noneExcluded)}
        className="flex w-full items-center gap-2 px-0.5 text-left"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border",
            noneExcluded
              ? "border-[#274d34] bg-[#1b2f22] text-accent-green"
              : allExcluded
                ? "text-transparent"
                : "border-[#274d34] bg-[#1b2f22] text-accent-green",
          )}
        >
          {noneExcluded ? (
            <Check className="size-3" />
          ) : allExcluded ? null : (
            <Minus className="size-3" />
          )}
        </span>
        <span className="text-foreground truncate text-[12px] font-semibold">{project}</span>
        <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10.5px]">
          {includedInGroup}/{shas.length}
        </span>
      </button>
      <div className="flex flex-col gap-1 pl-2">
        {commits.map((c) => {
          const on = !excluded.has(c.sha);
          return (
            <button
              key={`${c.source}-${c.sha}`}
              type="button"
              onClick={() => onToggle(c.sha)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                on ? "border-[#274d34] bg-[#151b16]" : "bg-muted opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border",
                  on ? "border-[#274d34] bg-[#1b2f22] text-accent-green" : "text-transparent",
                )}
              >
                <Check className="size-3" />
              </span>
              <span className="text-accent-green shrink-0 font-mono text-[10.5px]">
                {c.sha.slice(0, 7)}
              </span>
              <span className="truncate text-[12px] text-[#c8cdd5]">{c.message}</span>
            </button>
          );
        })}
      </div>
    </div>
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
