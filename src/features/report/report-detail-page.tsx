import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorAlert } from "@/components/common/error-alert";
import { Button } from "@/components/ui/button";
import { ReportView, ReportViewSkeleton } from "@/features/report/components/report-view";
import { useReport, useCommits } from "@/hooks/queries/use-reports";
import { formatDateLong } from "@/lib/date";

export function ReportDetailPage({ date }: { date: string }) {
  const { data: report, isLoading, isError, error } = useReport(date);
  const { data: commits, isLoading: commitsLoading } = useCommits(date);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={formatDateLong(date)}
        description="Kayıtlı günlük rapor"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="size-4" />
              Rapor Geçmişi
            </Link>
          </Button>
        }
      />

      {isError ? <ErrorAlert message={error instanceof Error ? error.message : undefined} /> : null}

      {isLoading ? (
        <ReportViewSkeleton />
      ) : report ? (
        <ReportView report={report} commits={commits} commitsLoading={commitsLoading} />
      ) : (
        <EmptyState title="Rapor bulunamadı" description="Bu tarihe ait kayıtlı bir rapor yok." />
      )}
    </div>
  );
}
