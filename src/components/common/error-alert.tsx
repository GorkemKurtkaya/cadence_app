import { AlertTriangle } from "lucide-react";

export function ErrorAlert({ message }: { message?: string }) {
  return (
    <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message ?? "Beklenmeyen bir hata oluştu."}</span>
    </div>
  );
}
