import { Link } from "@tanstack/react-router";
import {
  LayoutGrid,
  GitCommitHorizontal,
  FolderGit2,
  ScrollText,
  Flame,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useSettings, useToolStatus } from "@/hooks/queries/use-settings";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/commits", label: "Commitlerim", icon: GitCommitHorizontal },
  { to: "/projects", label: "Projeler", icon: FolderGit2 },
  { to: "/reports", label: "Rapor Geçmişi", icon: ScrollText },
  { to: "/streak", label: "Streak", icon: Flame },
];

const linkBase =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-normal text-[#8b93a0] transition-colors hover:text-foreground";
const linkActive = "bg-accent text-accent-green font-semibold";

function NavLink({ to, label, icon: Icon, exact }: NavItem) {
  return (
    <Link
      to={to}
      className={linkBase}
      activeProps={{ className: linkActive }}
      activeOptions={{ exact: exact ?? false }}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function ClaudeStatus() {
  const { data: settings } = useSettings();
  const { data: status } = useToolStatus();
  const ready =
    settings?.claudeMode === "api" ? Boolean(status?.hasApiKey) : Boolean(status?.cliAvailable);
  const modeLabel = settings?.claudeMode === "api" ? "Anthropic API" : "claude CLI";

  return (
    <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border p-2.5">
      <span
        className={cn(
          "size-2 rounded-full",
          ready ? "bg-accent-green shadow-[0_0_8px_var(--accent-green)]" : "bg-muted-foreground",
        )}
      />
      <div className="text-muted-foreground font-mono text-[11px] leading-tight">
        Claude
        <br />
        {modeLabel}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="bg-sidebar flex w-[212px] shrink-0 flex-col gap-1 border-r p-3 pt-4.5">
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
        <div className="bg-accent-green flex size-6.5 items-center justify-center rounded-md font-mono text-[13px] font-bold text-[#07130c]">
          λ
        </div>
        <div className="text-foreground text-[14.5px] font-semibold">CommitFlow</div>
      </div>

      {NAV.map((item) => (
        <NavLink key={item.to} {...item} />
      ))}

      <div className="flex-1" />

      <NavLink to="/settings" label="Ayarlar" icon={Settings} />
      <ClaudeStatus />
    </aside>
  );
}

// Skeleton eşleniği (sidebar yükleme sırasında sabit olduğundan basit tutuldu).
export function SidebarSkeleton() {
  return <aside className="bg-sidebar w-[212px] shrink-0 border-r" />;
}
