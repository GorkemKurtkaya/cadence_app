import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Copy, ChevronsUpDown, GitCommitHorizontal } from "lucide-react";
import { CommitCard, commitToText } from "@/components/common/commit-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommitDays } from "@/hooks/queries/use-commits";
import { useAppStore } from "@/stores/use-app-store";
import { rangeFor } from "@/services/stats";
import { todayKey } from "@/lib/date";
import { signedCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommitArea, CommitListDay } from "@/types";

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

  const today = todayKey();
  const range = useMemo(() => rangeFor(period === "daily" ? "weekly" : period, today), [period, today]);
  const { data: days, isLoading, isError, error } = useCommitDays(range.from, range.to);

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
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setProjectFilter(null)}
              className={cn(chip, projectFilter === null ? chipActive : chipIdle)}
            >
              Tümü
            </button>
            {projects.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProjectFilter(p)}
                className={cn(chip, projectFilter === p ? chipActive : chipIdle)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(["be", "fe"] as CommitArea[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                className={cn(chip, areaFilter === a ? chipActive : chipIdle)}
              >
                {a}
              </button>
            ))}
          </div>
          <span className="flex-1" />
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
            onClick={copyAll}
            disabled={totalCommits === 0}
            className="text-accent-green flex items-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <Copy className="size-3.5" />
            Toplu kopyala ({totalCommits})
          </button>
        </div>
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
            description="Bu aralıkta kayıtlı commit yok ya da filtreler eşleşmedi. Sağ üstten Rapor Üret ile tarama yapabilirsin."
          />
        ) : (
          <div className="flex flex-col gap-4.5">
            {filtered.map((d) => (
              <DayGroup key={d.date} day={d} today={today} isOpen={isOpen} toggle={toggle} />
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
}: {
  day: CommitListDay;
  today: string;
  isOpen: (sha: string) => boolean;
  toggle: (sha: string) => void;
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
          <CommitCard key={`${c.source}-${c.sha}`} commit={c} open={isOpen(c.sha)} onToggle={() => toggle(c.sha)} />
        ))}
      </div>
    </div>
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
