import { StatCard, StatCardSkeleton } from "@/components/common/stat-card";
import { HeatmapLegend } from "@/components/common/contribution-heatmap";
import { YearHeatmap } from "@/components/common/year-heatmap";
import { ErrorAlert } from "@/components/common/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreak } from "@/hooks/queries/use-stats";

export function StreakPage() {
  const { data, isLoading, isError, error } = useStreak();

  if (isError) {
    return (
      <div className="p-6">
        <ErrorAlert message={error instanceof Error ? error.message : undefined} />
      </div>
    );
  }
  if (isLoading || !data) return <StreakSkeleton />;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-3 gap-3.5">
        <StatCard
          label="Şu anki seri"
          value={
            <>
              {data.streak.current} <span className="text-muted-foreground text-[15px]">gün 🔥</span>
            </>
          }
          className="border-[#21402c] bg-[linear-gradient(150deg,#16241a,#141920)]"
        />
        <StatCard
          label="En uzun seri"
          value={
            <>
              {data.streak.longest} <span className="text-muted-foreground text-[15px]">gün</span>
            </>
          }
        />
        <StatCard
          label="Toplam aktif gün"
          value={
            <>
              {data.streak.totalActiveDays}{" "}
              <span className="text-muted-foreground text-[15px]">/365</span>
            </>
          }
        />
      </div>

      <div className="bg-panel rounded-xl border p-5.5">
        <div className="mb-4.5 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#c8cdd5]">Katkı takvimi · son 1 yıl</div>
          <HeatmapLegend />
        </div>
        <YearHeatmap calendar={data.calendar} />
      </div>
    </div>
  );
}

export function StreakSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-3 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
