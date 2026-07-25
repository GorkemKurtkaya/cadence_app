import { activityLevel } from "@/services/stats";
import { cn } from "@/lib/utils";
import type { DayActivity } from "@/types";

// 0–4 yoğunluk seviyesi → renk (tasarım paleti).
const LEVEL_BG = ["bg-[#161b21]", "bg-[#1d3a28]", "bg-[#2f7d4d]", "bg-[#43c46d]", "bg-[#4ade80]"] as const;

interface HeatmapProps {
  days: DayActivity[];
  /** Sütun sayısı (grid). Dashboard=7, streak=20. */
  columns: number;
  /** Son hücreyi (bugün) halkalı vurgula. */
  highlightLast?: boolean;
  className?: string;
}

/** Katkı takvimi ısı haritası — gün başına aktiviteyi renk yoğunluğuyla gösterir. */
export function ContributionHeatmap({ days, columns, highlightLast, className }: HeatmapProps) {
  return (
    <div
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {days.map((d, i) => {
        const last = highlightLast && i === days.length - 1;
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} commit`}
            className={cn(
              "aspect-square rounded-[3px]",
              LEVEL_BG[activityLevel(d.count)],
              last && "ring-accent-green ring-offset-background ring-2 ring-offset-1",
            )}
          />
        );
      })}
    </div>
  );
}

/** "az ▢▢▢▢▢ çok" renk ölçeği göstergesi. */
export function HeatmapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("text-muted-foreground flex items-center gap-1.5 font-mono text-[10px]", className)}>
      <span>az</span>
      {LEVEL_BG.map((bg) => (
        <span key={bg} className={cn("size-2.5 rounded-[2px]", bg)} />
      ))}
      <span>çok</span>
    </div>
  );
}
