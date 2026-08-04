import { useMemo, useState } from "react";
import { FolderGit2, Pencil, Check, X } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/queries/use-projects";
import { useRepos } from "@/hooks/queries/use-repos";
import { useSettings, useSaveSettings } from "@/hooks/queries/use-settings";
import { useAppStore } from "@/stores/use-app-store";
import { rangeFor } from "@/services/stats";
import { deriveProject } from "@/services/git/project";
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
  const openDrawerForProject = useAppStore((s) => s.openDrawerForProject);
  const today = todayKey();
  const range = useMemo(() => rangeFor(period, today), [period, today]);
  const { data: projects, isLoading, isError, error } = useProjects(range.from, range.to);
  const { data: repos } = useRepos();
  const { data: settings } = useSettings();
  const save = useSaveSettings();

  /** Projeye ait tüm repoların alias'ını yeni adla günceller (boş → türetilene döner). */
  const renameProject = (p: ProjectStats, newName: string) => {
    const current = settings?.projectAliases ?? {};
    const trimmed = newName.trim();
    // Bu projeye ait repolar: mevcut alias'larla türetilen proje adı eşleşenler.
    const members = (repos ?? []).filter((r) => deriveProject(r.name, current).project === p.project);
    const targets = members.length > 0 ? members.map((r) => r.name) : [p.repoName];
    const next = { ...current };
    for (const name of targets) {
      if (trimmed) next[name] = trimmed;
      else delete next[name];
    }
    save.mutate({ projectAliases: next });
  };

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
          <ProjectCard
            key={p.project}
            project={p}
            tint={TINTS[i % TINTS.length]}
            onReport={() => openDrawerForProject(p.project)}
            onRename={(name) => renameProject(p, name)}
          />
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
  onRename,
}: {
  project: ProjectStats;
  tint: string;
  onReport: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.project);

  const startEdit = () => {
    setDraft(p.project);
    setEditing(true);
  };
  const commit = () => {
    if (draft.trim() && draft.trim() !== p.project) onRename(draft);
    setEditing(false);
  };

  return (
    <div className="bg-panel rounded-xl border p-5">
      <div className="mb-4.5 flex items-center gap-3.5">
        <div
          className={`flex size-11 items-center justify-center rounded-xl font-mono text-lg font-bold text-[#08160d] ${tint}`}
        >
          {p.project.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="h-8 text-[15px]"
              />
              <button
                type="button"
                onClick={commit}
                className="text-accent-green shrink-0 rounded-md border border-[#274d34] bg-[#1b2f22] p-1.5"
                aria-label="Kaydet"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-muted-foreground hover:text-destructive shrink-0 rounded-md border p-1.5"
                aria-label="İptal"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-foreground truncate text-[17px] font-semibold">{p.project}</span>
              <button
                type="button"
                onClick={startEdit}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Adı düzenle"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
          <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
            {p.repoPath || p.repoName}
          </div>
        </div>
        <button
          type="button"
          onClick={onReport}
          className="text-accent-green shrink-0 rounded-lg border border-[#274d34] bg-[#1b2f22] px-3.5 py-2 text-[12.5px] font-semibold"
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
