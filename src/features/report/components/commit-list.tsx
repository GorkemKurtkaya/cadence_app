import { GitCommitHorizontal, Github } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import type { CommitRow } from "@/types";

function timeOf(iso: string): string {
  return iso.slice(11, 16) || "--:--";
}

export function CommitList({ commits }: { commits: CommitRow[] }) {
  if (commits.length === 0) {
    return <EmptyState icon={<GitCommitHorizontal />} title="Bu güne ait kayıtlı commit yok" />;
  }

  return (
    <div className="space-y-2">
      {commits.map((c) => (
        <Card key={`${c.source}-${c.sha}`} className="gap-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{c.message}</p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="gap-1">
                  {c.source === "github" ? <Github className="size-3" /> : <GitCommitHorizontal className="size-3" />}
                  {c.repoName}
                </Badge>
                <span>{timeOf(c.committedAt)}</span>
                <span className="font-mono">{c.sha.slice(0, 7)}</span>
                {c.author ? <span>· {c.author}</span> : null}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs">
              <span className="text-emerald-500">+{c.additions}</span>{" "}
              <span className="text-destructive">-{c.deletions}</span>
              <p className="text-muted-foreground">{c.filesChanged} dosya</p>
            </div>
          </div>
          {c.body ? (
            <pre className="text-muted-foreground border-border/60 mt-1 border-t pt-2 text-xs whitespace-pre-wrap">
              {c.body}
            </pre>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export function CommitListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
