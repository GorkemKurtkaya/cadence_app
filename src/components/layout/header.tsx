import { useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/use-app-store";
import { cn } from "@/lib/utils";
import type { ReportPeriod } from "@/types";

interface ScreenMeta {
  title: string;
  subtitle: string;
  controls: boolean;
}

const META: Record<string, ScreenMeta> = {
  "/": { title: "Genel Bakış", subtitle: "commit ve rapor özetin", controls: true },
  "/commits": { title: "Commitlerim", subtitle: "tarama sonucu commit'ler", controls: true },
  "/projects": { title: "Projeler", subtitle: "izlenen repolar", controls: true },
  "/reports": { title: "Rapor Geçmişi", subtitle: "üretilen raporlar", controls: false },
  "/streak": { title: "Streak", subtitle: "katkı geçmişin", controls: false },
  "/settings": { title: "Ayarlar", subtitle: "bağlantı ve rapor tercihleri", controls: false },
};

const PERIODS: Array<{ value: ReportPeriod; label: string }> = [
  { value: "daily", label: "Gün" },
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Ay" },
  { value: "yearly", label: "Yıl" },
];

function metaFor(pathname: string): ScreenMeta {
  if (META[pathname]) return META[pathname];
  if (pathname.startsWith("/report/"))
    return { title: "Rapor", subtitle: "kayıtlı günlük rapor", controls: false };
  return { title: "Cadence", subtitle: "", controls: false };
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meta = metaFor(pathname);
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const openDrawer = useAppStore((s) => s.openDrawer);

  return (
    <header className="flex items-center justify-between border-b px-6 py-5">
      <div>
        <div className="text-foreground text-xl font-semibold">{meta.title}</div>
        {meta.subtitle ? (
          <div className="text-muted-foreground mt-0.5 font-mono text-[12.5px]">{meta.subtitle}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        {meta.controls ? (
          <div className="bg-muted flex gap-0.5 rounded-lg border p-0.5 font-mono text-[12.5px]">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  period === p.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={openDrawer}
          className="bg-accent-green flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13.5px] font-bold text-[#08160d] transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-4" />
          Rapor Üret
        </button>
      </div>
    </header>
  );
}
