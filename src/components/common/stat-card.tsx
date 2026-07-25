import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Alt satırın tonu. */
  subTone?: "green" | "red" | "muted";
  className?: string;
}

const SUB_TONE: Record<NonNullable<StatCardProps["subTone"]>, string> = {
  green: "text-accent-green",
  red: "text-destructive",
  muted: "text-muted-foreground",
};

/** Dashboard/streak stat kartı — küçük etiket + büyük mono değer + alt satır. */
export function StatCard({ label, value, sub, subTone = "muted", className }: StatCardProps) {
  return (
    <div className={cn("bg-panel rounded-xl border p-4", className)}>
      <div className="text-muted-foreground text-[11.5px] font-medium tracking-wider uppercase">
        {label}
      </div>
      <div className="text-foreground mt-1.5 font-mono text-3xl font-bold">{value}</div>
      {sub ? <div className={cn("mt-0.5 text-xs", SUB_TONE[subTone])}>{sub}</div> : null}
    </div>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-panel rounded-xl border p-4", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}
