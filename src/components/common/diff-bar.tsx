import { cn } from "@/lib/utils";

interface DiffBarProps {
  additions: number;
  deletions: number;
  /** Toplam segment sayısı. */
  segments?: number;
  className?: string;
}

/** Ekleme/silme oranını gösteren küçük segmentli çubuk (tasarımdaki gibi). */
export function DiffBar({ additions, deletions, segments = 5, className }: DiffBarProps) {
  const total = additions + deletions;
  const greens = total === 0 ? segments : Math.max(1, Math.round((additions / total) * segments));
  const reds = segments - greens;
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: greens }).map((_, i) => (
        <span key={`g${i}`} className="size-2 rounded-[2px] bg-[#2f7d4d]" />
      ))}
      {Array.from({ length: reds }).map((_, i) => (
        <span key={`r${i}`} className="size-2 rounded-[2px] bg-[#7f3535]" />
      ))}
    </div>
  );
}
