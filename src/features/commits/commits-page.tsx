import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Search,
  Copy,
  ChevronsUpDown,
  ChevronDown,
  Check,
  Minus,
  CheckSquare,
  GitCommitHorizontal,
  DownloadCloud,
  FileJson,
  Loader2,
  X,
  Layers,
  Server,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { CommitCard, commitToText } from "@/components/common/commit-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommitDays, useScanCommits } from "@/hooks/queries/use-commits";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { useAppStore } from "@/stores/use-app-store";
import { rangeFor } from "@/services/stats";
import { exportCommitsJson } from "@/services/export";
import { todayKey } from "@/lib/date";
import { signedCompact } from "@/lib/format";
import { PULL_PRESETS, presetToRange, type PullPreset } from "@/lib/pull-presets";
import { cn } from "@/lib/utils";
import type { CommitArea, CommitListDay, CommitRow } from "@/types";

function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split("-");
  const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const human = `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  const diff = (new Date(today).getTime() - new Date(date).getTime()) / 86_400_000;
  if (date === today) return `Bugün · ${human}`;
  if (Math.round(diff) === 1) return `Dün · ${human}`;
  return `${human} ${y}`;
}

const chip = "rounded-md border px-3 py-1.5 font-mono text-xs transition-colors";
const chipActive = "border-[#274d34] bg-[#1b2f22] text-accent-green";
const chipIdle = "bg-[#161b21] text-[#7b828f] hover:text-foreground";

// Katman (area) filtresi: Tümü / Backend / Frontend — ikonlu.
const AREA_FILTERS: Array<{ value: CommitArea | null; label: string; Icon: LucideIcon }> = [
  { value: null, label: "Tümü", Icon: Layers },
  { value: "be", label: "Backend", Icon: Server },
  { value: "fe", label: "Frontend", Icon: Monitor },
];

export function CommitsPage() {
  const period = useAppStore((s) => s.period);
  const search = useAppStore((s) => s.commitSearch);
  const setSearch = useAppStore((s) => s.setCommitSearch);
  const projectFilter = useAppStore((s) => s.commitProject);
  const setProjectFilter = useAppStore((s) => s.setCommitProject);
  const areaFilter = useAppStore((s) => s.commitArea);
  const setAreaFilter = useAppStore((s) => s.setCommitArea);
  const expandedAll = useAppStore((s) => s.commitsExpandedAll);
  const toggleExpandAll = useAppStore((s) => s.toggleExpandAll);
  const commitRange = useAppStore((s) => s.commitRange);
  const setCommitRange = useAppStore((s) => s.setCommitRange);
  const selectedShas = useAppStore((s) => s.selectedShas);
  const toggleCommitSelected = useAppStore((s) => s.toggleCommitSelected);
  const setCommitSelection = useAppStore((s) => s.setCommitSelection);
  const clearCommitSelection = useAppStore((s) => s.clearCommitSelection);

  const today = todayKey();
  // Çekilen aralık varsa listeyi o belirler; yoksa header periyot toggle'ı.
  const range = useMemo(
    () => commitRange ?? rangeFor(period, today),
    [commitRange, period, today],
  );
  const { data: days, isLoading, isError, error } = useCommitDays(range.from, range.to);

  // Kullanıcı header'dan periyot değiştirince çekilen aralık geçersizleşir (toggle devralır).
  useEffect(() => setCommitRange(null), [period, setCommitRange]);

  const scan = useScanCommits();
  const projectScroll = useDragScroll();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pulledLabel, setPulledLabel] = useState<string | null>(null);

  const runPull = (preset: PullPreset) => {
    const { scanFrom, displayFrom, to } = presetToRange(preset, today);
    scan.mutate(
      { from: scanFrom, to },
      {
        onSuccess: (res) => {
          setCommitRange({ from: displayFrom, to: today });
          setPulledLabel(preset.label);
          setPickerOpen(false);
          toast.success(`${res.commits.length} commit çekildi · ${preset.label}`);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Commitler çekilemedi");
        },
      },
    );
  };

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const isOpen = (sha: string) => openMap[sha] ?? expandedAll;
  const toggle = (sha: string) => setOpenMap((m) => ({ ...m, [sha]: !(m[sha] ?? expandedAll) }));

  const projects = useMemo(() => {
    const set = new Set<string>();
    days?.forEach((d) => d.items.forEach((c) => set.add(c.project)));
    return [...set];
  }, [days]);

  const filtered: CommitListDay[] = useMemo(() => {
    if (!days) return [];
    const q = search.trim().toLowerCase();
    return days
      .map((d) => ({
        ...d,
        items: d.items.filter((c) => {
          if (projectFilter && c.project !== projectFilter) return false;
          if (areaFilter && c.area !== areaFilter) return false;
          if (q) {
            const hay = `${c.message} ${c.body} ${c.sha} ${c.paths.join(" ")}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        }),
      }))
      .filter((d) => d.items.length > 0);
  }, [days, search, projectFilter, areaFilter]);

  const totalCommits = filtered.reduce((n, d) => n + d.items.length, 0);
  const copyAll = async () => {
    const text = filtered
      .map((d) => `${dayLabel(d.date, today)}\n\n${d.items.map(commitToText).join("\n\n---\n\n")}`)
      .join("\n\n\n");
    await navigator.clipboard.writeText(text);
    toast.success(`${totalCommits} commit kopyalandı`);
  };

  // Görünen (filtrelenmiş) commit'ler arasından seçili olanları say — "temizle" bunları kapsar.
  const selectedCount = filtered.reduce(
    (n, d) => n + d.items.filter((c) => selectedShas.has(c.sha)).length,
    0,
  );
  const copySelected = async () => {
    const text = filtered
      .map((d) => ({ ...d, items: d.items.filter((c) => selectedShas.has(c.sha)) }))
      .filter((d) => d.items.length > 0)
      .map((d) => `${dayLabel(d.date, today)}\n\n${d.items.map(commitToText).join("\n\n---\n\n")}`)
      .join("\n\n\n");
    await navigator.clipboard.writeText(text);
    toast.success(`${selectedCount} commit kopyalandı`);
  };

  // Filtrelenmiş günleri düz commit listesine indirger (JSON dışa aktarım için).
  const flatCommits = (onlySelected: boolean): CommitRow[] =>
    filtered.flatMap((d) =>
      onlySelected ? d.items.filter((c) => selectedShas.has(c.sha)) : d.items,
    );

  // JSON export proje seçimi: görünen commit'lerdeki projeler + opt-out hariç tutma seti.
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  // Export'tan hariç tutulan projeler (opt-out). Boş → hepsi dahil.
  const [exportExcluded, setExportExcluded] = useState<Set<string>>(new Set());
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // Menü portal ile body'ye basılıp buton konumuna göre fixed yerleştirilir (ancestor kırpmasın).
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const toggleExportMenu = () =>
    setExportMenuOpen((o) => {
      if (!o) {
        const r = exportBtnRef.current?.getBoundingClientRect();
        if (r) setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
      }
      return !o;
    });

  // Görünen (filtrelenmiş) commit'lerde yer alan projeler — export menüsünü besler.
  const visibleProjects = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((d) => d.items.forEach((c) => set.add(c.project)));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [filtered]);

  const toggleExportProject = (p: string) =>
    setExportExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  const allProjectsIncluded = visibleProjects.every((p) => !exportExcluded.has(p));
  const someProjectsIncluded = visibleProjects.some((p) => !exportExcluded.has(p));
  const toggleAllProjects = () =>
    setExportExcluded(allProjectsIncluded ? new Set(visibleProjects) : new Set());

  // Export'a girecek commit sayısı (seçili projelere göre).
  const exportCount = flatCommits(false).filter((c) => !exportExcluded.has(c.project)).length;

  // Menü dışına tıklanınca kapat (buton ve portal menü hariç).
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (exportBtnRef.current?.contains(t) || exportMenuRef.current?.contains(t)) return;
      setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportMenuOpen]);

  // Görünen tüm commit'ler seçili mi? (seçimi kaldır/tümünü seç toggle'ı için)
  const allSelected = totalCommits > 0 && selectedCount === totalCommits;
  const toggleSelectAll = () => {
    if (allSelected) clearCommitSelection();
    else setCommitSelection(flatCommits(false).map((c) => c.sha));
  };

  const exportJson = async (onlySelected: boolean) => {
    const base = flatCommits(onlySelected);
    // "Tümü" export'unda seçili projelere göre süz; "Seçilenler" zaten açık commit seçimi.
    const commits = onlySelected ? base : base.filter((c) => !exportExcluded.has(c.project));
    if (commits.length === 0) return;
    const prefix = onlySelected ? "secili-commitler" : "commitler";
    const name = `${prefix}-${range.from}_${range.to}.json`;
    try {
      const path = await exportCommitsJson(commits, name);
      if (path) {
        toast.success(`${commits.length} commit JSON olarak kaydedildi`);
        setExportMenuOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "JSON kaydedilemedi");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2.5 border-b px-6 py-3.5">
        <div className="bg-[#0f1418] flex items-center gap-2 rounded-lg border px-3 py-2.5">
          <Search className="text-muted-foreground size-3.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="commit mesajı, açıklama, dosya veya hash ara…"
            className="text-foreground placeholder:text-muted-foreground w-full bg-transparent font-mono text-[12.5px] outline-none"
          />
        </div>
        {/* Proje filtreleri: çok olabildiği için kendi satırında yatay kaydırmalı (tekerlek + sürükle). */}
        <div {...projectScroll} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 select-none">
          <button
            type="button"
            onClick={() => setProjectFilter(null)}
            className={cn(chip, "shrink-0", projectFilter === null ? chipActive : chipIdle)}
          >
            Tümü
          </button>
          {projects.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProjectFilter(p)}
              className={cn(chip, "shrink-0 whitespace-nowrap", projectFilter === p ? chipActive : chipIdle)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex gap-1.5">
            {AREA_FILTERS.map(({ value, label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setAreaFilter(value)}
                className={cn(chip, "flex items-center gap-1.5", areaFilter === value ? chipActive : chipIdle)}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            disabled={scan.isPending}
            className="text-accent-green flex items-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {scan.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <DownloadCloud className="size-3.5" />
            )}
            {scan.isPending ? "Çekiliyor…" : "Commitlerimi Çek"}
          </button>
          <button
            type="button"
            onClick={toggleExpandAll}
            className="text-secondary-foreground bg-[#161b21] flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
          >
            <ChevronsUpDown className="size-3.5" />
            {expandedAll ? "Tümünü kapat" : "Tümünü aç"}
          </button>
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={totalCommits === 0}
            className="text-secondary-foreground bg-[#161b21] flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <CheckSquare className="size-3.5" />
            {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
          </button>
          <button
            type="button"
            onClick={copyAll}
            disabled={totalCommits === 0}
            className="text-accent-green flex items-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <Copy className="size-3.5" />
            Toplu kopyala ({totalCommits})
          </button>
          <button
            ref={exportBtnRef}
            type="button"
            onClick={toggleExportMenu}
            disabled={totalCommits === 0}
            className="text-secondary-foreground bg-[#161b21] flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <FileJson className="size-3.5" />
            JSON indir ({exportCount})
            <ChevronDown className={cn("size-3.5 transition-transform", exportMenuOpen && "rotate-180")} />
          </button>
          {exportMenuOpen && menuPos
            ? createPortal(
                <div
                  ref={exportMenuRef}
                  style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
                  className="bg-[#0f1418] z-50 w-60 rounded-lg border p-2 shadow-lg"
                >
                  <div className="text-muted-foreground mb-1 px-1.5 text-[10.5px] font-medium tracking-wider uppercase">
                    Projeler
                  </div>
                  <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                    <ProjectCheck
                      label="Tümü"
                      checked={allProjectsIncluded}
                      indeterminate={!allProjectsIncluded && someProjectsIncluded}
                      onClick={toggleAllProjects}
                      bold
                    />
                    {visibleProjects.map((p) => (
                      <ProjectCheck
                        key={p}
                        label={p}
                        checked={!exportExcluded.has(p)}
                        onClick={() => toggleExportProject(p)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => exportJson(false)}
                    disabled={exportCount === 0}
                    className="text-accent-green mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    <FileJson className="size-3.5" />
                    {exportCount} commit indir
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>

        {(pickerOpen || commitRange) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {pickerOpen && (
              <>
                <span className="text-muted-foreground font-mono text-[11px]">Ne kadar geriye:</span>
                {PULL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => runPull(p)}
                    disabled={scan.isPending}
                    className={cn(chip, chipIdle, "disabled:opacity-60")}
                  >
                    {p.label}
                  </button>
                ))}
              </>
            )}
            {commitRange && (
              <button
                type="button"
                onClick={() => {
                  setCommitRange(null);
                  setPulledLabel(null);
                }}
                className={cn(chip, chipActive, "ml-auto flex items-center gap-1.5")}
                title="Aralığı temizle, periyot toggle'ına dön"
              >
                aralık: {pulledLabel ?? `${commitRange.from} → ${commitRange.to}`}
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#274d34] bg-[#1b2f22] px-3 py-2">
            <CheckSquare className="text-accent-green size-3.5" />
            <span className="text-accent-green font-mono text-xs font-semibold">
              {selectedCount} seçili
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={copySelected}
              className="text-accent-green flex items-center gap-1.5 rounded-md border border-[#274d34] bg-[#152318] px-3 py-1.5 text-xs font-semibold"
            >
              <Copy className="size-3.5" />
              Seçilenleri Kopyala
            </button>
            <button
              type="button"
              onClick={() => exportJson(true)}
              className="text-accent-green flex items-center gap-1.5 rounded-md border border-[#274d34] bg-[#152318] px-3 py-1.5 text-xs font-semibold"
            >
              <FileJson className="size-3.5" />
              Seçilenleri JSON indir
            </button>
            <button
              type="button"
              onClick={clearCommitSelection}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
            >
              <X className="size-3.5" />
              Temizle
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4.5">
        {isError ? (
          <ErrorAlert message={error instanceof Error ? error.message : undefined} />
        ) : isLoading ? (
          <CommitsSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GitCommitHorizontal />}
            title="Commit bulunamadı"
            description="Bu aralıkta kayıtlı commit yok ya da filtreler eşleşmedi. Yukarıdaki Commitlerimi Çek ile eski commit'lerini içeri alabilirsin."
          />
        ) : (
          <div className="flex flex-col gap-4.5">
            {filtered.map((d) => (
              <DayGroup
                key={d.date}
                day={d}
                today={today}
                isOpen={isOpen}
                toggle={toggle}
                selectedShas={selectedShas}
                onSelect={toggleCommitSelected}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayGroup({
  day,
  today,
  isOpen,
  toggle,
  selectedShas,
  onSelect,
}: {
  day: CommitListDay;
  today: string;
  isOpen: (sha: string) => boolean;
  toggle: (sha: string) => void;
  selectedShas: Set<string>;
  onSelect: (sha: string) => void;
}) {
  const copyDay = async () => {
    await navigator.clipboard.writeText(
      `${dayLabel(day.date, today)}\n\n${day.items.map(commitToText).join("\n\n---\n\n")}`,
    );
    toast.success("Gün kopyalandı");
  };
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-3">
        <div className="text-[13px] font-semibold text-[#c8cdd5]">{dayLabel(day.date, today)}</div>
        <div className="h-px flex-1 bg-border" />
        <div className="text-muted-foreground font-mono text-[11.5px]">
          {day.commits} commit · {signedCompact(day.additions)} / −{day.deletions}
        </div>
        <button
          type="button"
          onClick={copyDay}
          className="text-muted-foreground flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11.5px]"
        >
          <Copy className="size-3" />
          günü kopyala
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {day.items.map((c) => (
          <CommitCard
            key={`${c.source}-${c.sha}`}
            commit={c}
            open={isOpen(c.sha)}
            onToggle={() => toggle(c.sha)}
            selected={selectedShas.has(c.sha)}
            onSelect={() => onSelect(c.sha)}
          />
        ))}
      </div>
    </div>
  );
}

/** Export menüsündeki tek proje satırı: checkbox (tri-state için indeterminate) + ad. */
function ProjectCheck({
  label,
  checked,
  indeterminate,
  onClick,
  bold,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onClick: () => void;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-[#161b21] flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left"
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border",
          checked || indeterminate
            ? "border-[#274d34] bg-[#1b2f22] text-accent-green"
            : "border-border text-transparent",
        )}
      >
        {checked ? (
          <Check className="size-3" />
        ) : indeterminate ? (
          <Minus className="size-3" />
        ) : null}
      </span>
      <span
        className={cn(
          "truncate text-[12px]",
          bold ? "text-foreground font-semibold" : "text-[#c8cdd5]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function CommitsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
