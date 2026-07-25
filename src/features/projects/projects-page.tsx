import { useMemo } from "react";
import { FolderGit2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/queries/use-projects";
import { useAppStore } from "@/stores/use-app-store";
import { rangeFor } from "@/services/stats";
import { todayKey } from "@/lib/date";
import { signedCompact } from "@/lib/format";
import type { ProjectStats } from "@/types";

const TINTS = [
  "bg-[linear-gradient(135deg,#4ade80,#22a06b)]",
  "bg-[linear-gradient(135deg,#60a5fa,#2563eb)]",
  "bg-[linear-gradient(135deg,#a78bfa,#7c3aed)]",
  "bg-[linear-gradient(135deg,#f59e0b,#d97706)]",
];

export function ProjectsPage() {
  const period = useAppStore((s) => s.period);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const today = todayKey();
  const range = useMemo(() => rangeFor(period === "daily" ? "weekly" : period, today), [period, today]);
  const { data: projects, isLoading, isError, error } = useProjects(range.from, range.to);

  return (
    <div className="flex flex-col gap-4 p-6">
      {isError ? (
        <ErrorAlert message={error instanceof Error ? error.message : undefined} />
      ) : isLoading ? (
        <ProjectsSkeleton />
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 />}
          title="İzlenen proje yok"
          description="Ayarlar'dan repo köklerini ekleyip Rapor Üret ile tarama yap; projeler burada listelenecek."
        />
      ) : (
        projects.map((p, i) => (
          <ProjectCard key={p.repoName} project={p} tint={TINTS[i % TINTS.length]} onReport={openDrawer} />
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-[#0f1418] p-3">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="text-foreground mt-0.5 font-mono text-[23px] font-bold">{value}</div>
    </div>
  );
}

function ProjectCard({
  project: p,
  tint,
  onReport,
}: {
  project: ProjectStats;
  tint: string;
  onReport: () => void;
}) {
  return (
    <div className="bg-panel rounded-xl border p-5">
      <div className="mb-4.5 flex items-center gap-3.5">
        <div
          className={`flex size-11 items-center justify-center rounded-xl font-mono text-lg font-bold text-[#08160d] ${tint}`}
        >
          {p.project.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-foreground text-[17px] font-semibold">{p.project}</div>
          <div className="text-muted-foreground mt-0.5 font-mono text-xs">{p.repoPath || p.repoName}</div>
        </div>
        <button
          type="button"
          onClick={onReport}
          className="text-accent-green rounded-lg border border-[#274d34] bg-[#1b2f22] px-3.5 py-2 text-[12.5px] font-semibold"
        >
          Rapor Üret
        </button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        <Stat label="Bu dönem" value={p.commits} />
        <Stat label="Backend" value={p.backend} />
        <Stat label="Frontend" value={p.frontend} />
        <Stat label="Satır" value={signedCompact(p.additions)} />
      </div>

      {p.lastCommit ? (
        <>
          <div className="text-muted-foreground mb-2 text-[11px] tracking-wider uppercase">Son commit</div>
          <div className="flex items-start gap-3">
            <span className="text-accent-green mt-0.5 rounded bg-[#152318] px-1.5 py-0.5 font-mono text-[11px]">
              {p.lastCommit.sha.slice(0, 7)}
            </span>
            <span className="flex-1 text-[13px] leading-snug text-[#cfd4dc]">
              {p.lastCommit.message}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-52 w-full rounded-xl" />
      ))}
    </div>
  );
}
