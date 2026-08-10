import { Link } from "@tanstack/react-router";
import { StatCard, StatCardSkeleton } from "@/components/common/stat-card";
import { ContributionHeatmap, HeatmapLegend } from "@/components/common/contribution-heatmap";
import { YearHeatmap } from "@/components/common/year-heatmap";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingWizard } from "@/features/dashboard/components/onboarding-wizard";
import { useDashboard, useStreak, type DashboardData } from "@/hooks/queries/use-stats";
import { useAppStore } from "@/stores/use-app-store";
import { signedCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportPeriod } from "@/types";

const PANEL = "bg-panel rounded-xl border p-4";

// Seçili periyoda göre etiketler (üst stat kartları + proje dağılımı).
const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Bugün",
  weekly: "Bu hafta",
  monthly: "Bu ay",
  yearly: "Bu yıl",
};
const PERIOD_SUB: Record<ReportPeriod, string> = {
  daily: "bugün",
  weekly: "son 7 gün",
  monthly: "bu ay",
  yearly: "bu yıl",
};

export function DashboardPage() {
  const period = useAppStore((s) => s.period);
  const { data, isLoading, isError, error } = useDashboard(period);

  if (isError) {
    return (
      <div className="p-6">
        <ErrorAlert message={error instanceof Error ? error.message : undefined} />
      </div>
    );
  }
  if (isLoading || !data) return <DashboardSkeleton />;

  const empty = data.streak.totalActiveDays === 0 && data.recent.length === 0;
  if (empty) return <OnboardingWizard />;

  return (
    <div className="grid grid-cols-4 content-start gap-3.5 p-6">
      <StatCard
        label={`${PERIOD_LABEL[period]} commit`}
        value={data.periodStats.commits}
        sub={PERIOD_SUB[period]}
        subTone="muted"
      />

      <StreakCard data={data} />

      <StatCard
        label="Değişen satır"
        value={signedCompact(data.periodStats.additions)}
        sub={`−${data.periodStats.deletions} silinen`}
        subTone="red"
      />

      <WeeklyActivity data={data} />
      <ProjectDistribution data={data} period={period} />
      <YearActivity />
      <RecentCommits data={data} />
    </div>
  );
}

function StreakCard({ data }: { data: DashboardData }) {
  return (
    <div className="col-span-2 flex items-center gap-4 rounded-xl border border-[#21402c] bg-[linear-gradient(150deg,#16241a,#141920_62%)] p-4">
      <div className="shrink-0">
        <div className="text-[11.5px] tracking-wider text-[#9fb0a4] uppercase">Aktif seri</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-foreground font-mono text-4xl leading-none font-bold">
            {data.streak.current}
          </div>
          <div className="text-muted-foreground text-[15px]">gün 🔥</div>
        </div>
        <div className="text-accent-green mt-1.5 font-mono text-[11.5px]">
          en uzun: {data.streak.longest} gün
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <ContributionHeatmap days={data.heatmap21} columns={7} highlightLast />
      </div>
    </div>
  );
}

function WeeklyActivity({ data }: { data: DashboardData }) {
  const max = Math.max(...data.weekActivity.map((d) => d.count), 1);
  return (
    <div className={cn(PANEL, "col-span-2")}>
      <div className="mb-3.5 text-[13.5px] font-semibold text-[#c8cdd5]">Haftalık aktivite</div>
      <div className="flex h-24 items-end gap-2.5">
        {data.weekActivity.map((d) => {
          const isMax = d.count === max && d.count > 0;
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-full rounded-t",
                  isMax ? "bg-[linear-gradient(#4ade80,#22a06b)]" : "bg-[#2a3340]",
                )}
                style={{ height: `${Math.max(4, (d.count / max) * 80)}px` }}
              />
              <span className="text-muted-foreground font-mono text-[10.5px]">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** GitHub tarzı yıllık katkı takvimi paneli — kendi query'siyle yüklenir (streak ile cache paylaşır). */
function YearActivity() {
  const { data } = useStreak();
  return (
    <div className={cn(PANEL, "col-span-4")}>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[13.5px] font-semibold text-[#c8cdd5]">Katkı takvimi · son 1 yıl</div>
        <HeatmapLegend />
      </div>
      {data ? (
        <YearHeatmap calendar={data.calendar} />
      ) : (
        <Skeleton className="h-28 w-full rounded-lg" />
      )}
    </div>
  );
}

const BAR_COLORS = ["bg-[#4ade80]", "bg-[#60a5fa]", "bg-[#a78bfa]", "bg-[#f59e0b]"];

function ProjectDistribution({ data, period }: { data: DashboardData; period: ReportPeriod }) {
  const total = data.projects.reduce((n, p) => n + p.commits, 0) || 1;
  return (
    <div className={cn(PANEL, "col-span-2")}>
      <div className="mb-3.5 text-[13.5px] font-semibold text-[#c8cdd5]">Proje dağılımı</div>
      {data.projects.length === 0 ? (
        <div className="text-muted-foreground text-xs">{PERIOD_LABEL[period]} commit yok.</div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {data.projects.slice(0, 4).map((p, i) => (
            <div key={p.project}>
              <div className="mb-1.5 flex justify-between text-[12.5px]">
                <span className="text-foreground">{p.project}</span>
                <span className="text-muted-foreground font-mono">{p.commits}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-[#232a33]">
                <div
                  className={cn("h-full", BAR_COLORS[i % BAR_COLORS.length])}
                  style={{ width: `${(p.commits / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentCommits({ data }: { data: DashboardData }) {
  return (
    <div className={cn(PANEL, "col-span-4")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13.5px] font-semibold text-[#c8cdd5]">Son commitler</div>
        <Link to="/commits" className="text-muted-foreground text-xs">
          tümü →
        </Link>
      </div>
      {data.recent.length === 0 ? (
        <div className="text-muted-foreground text-xs">Kayıtlı commit yok.</div>
      ) : (
        data.recent.map((c) => (
          <div
            key={`${c.source}-${c.sha}`}
            className="flex items-start gap-3 border-t py-2 first:border-t-0"
          >
            <span className="text-accent-green mt-0.5 rounded bg-[#152318] px-1.5 py-0.5 font-mono text-[11px]">
              {c.sha.slice(0, 7)}
            </span>
            <span className="flex-1 text-[13px] leading-snug text-[#cfd4dc]">{c.message}</span>
            <span className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
              {c.project}
              {c.area !== "other" ? `·${c.area}` : ""}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3.5 p-6">
      <StatCardSkeleton />
      <Skeleton className="col-span-2 h-28 rounded-xl" />
      <StatCardSkeleton />
      <Skeleton className="col-span-2 h-40 rounded-xl" />
      <Skeleton className="col-span-2 h-40 rounded-xl" />
      <Skeleton className="col-span-4 h-44 rounded-xl" />
      <Skeleton className="col-span-4 h-48 rounded-xl" />
    </div>
  );
}
