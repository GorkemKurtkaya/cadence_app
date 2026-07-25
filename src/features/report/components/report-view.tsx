import { useState } from "react";
import { Copy, Check, FileText, Users, Wrench, GitCommitHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/common/markdown";
import { EmptyState } from "@/components/common/empty-state";
import { CommitList, CommitListSkeleton } from "./commit-list";
import type { CommitRow, DailyReport } from "@/types";

const SECTIONS = [
  { key: "summaryMd", label: "Özet", icon: FileText },
  { key: "standupMd", label: "Standup", icon: Users },
  { key: "technicalMd", label: "Teknik", icon: Wrench },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="outline" size="sm" onClick={onCopy} disabled={!text}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Kopyalandı" : "Kopyala"}
    </Button>
  );
}

interface ReportViewProps {
  report: DailyReport;
  commits?: CommitRow[];
  commitsLoading?: boolean;
}

export function ReportView({ report, commits, commitsLoading }: ReportViewProps) {
  // Yalnızca dolu bölümleri sekme olarak göster.
  const activeSections = SECTIONS.filter(({ key }) => report[key]?.trim());
  const commitCount = commits?.length ?? 0;
  const defaultTab = activeSections[0]?.key ?? "commits";

  const hasAnything = activeSections.length > 0 || commitCount > 0;
  if (!hasAnything) {
    return <EmptyState title="Bu rapor boş" description="Bu güne ait commit bulunamadığı için içerik yok." />;
  }

  return (
    <Tabs defaultValue={defaultTab} className="gap-4">
      <div className="flex items-center justify-between">
        <TabsList>
          {activeSections.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key}>
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="commits">
            <GitCommitHorizontal className="size-4" />
            Commitler
            {commitCount > 0 ? <Badge variant="secondary">{commitCount}</Badge> : null}
          </TabsTrigger>
        </TabsList>
        {report.model && report.model !== "-" ? (
          <Badge variant="secondary">
            {report.mode} · {report.model}
          </Badge>
        ) : null}
      </div>

      {activeSections.map(({ key }) => (
        <TabsContent key={key} value={key} className="space-y-3">
          <div className="flex justify-end">
            <CopyButton text={report[key]} />
          </div>
          <Markdown>{report[key]}</Markdown>
        </TabsContent>
      ))}

      <TabsContent value="commits">
        {commitsLoading ? <CommitListSkeleton /> : <CommitList commits={commits ?? []} />}
      </TabsContent>
    </Tabs>
  );
}

export function ReportViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
