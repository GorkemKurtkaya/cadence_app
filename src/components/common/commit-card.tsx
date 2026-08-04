import { useState } from "react";
import { ChevronRight, Copy, Check } from "lucide-react";
import { DiffBar } from "@/components/common/diff-bar";
import { clockOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommitRow } from "@/types";

/** Bir commit'i kopyalanabilir düz metne çevirir. */
export function commitToText(c: CommitRow): string {
  const head = `${c.sha.slice(0, 7)} ${c.project}${c.area !== "other" ? "/" + c.area : ""} — ${c.message}`;
  return c.body ? `${head}\n\n${c.body}` : head;
}

interface CommitCardProps {
  commit: CommitRow;
  open: boolean;
  onToggle: () => void;
  /** Verilirse kartın başında seçim kutucuğu gösterilir (kopyala/rapor seçimi için). */
  selected?: boolean;
  onSelect?: () => void;
}

/** Commitlerim ekranındaki açılır commit kartı. */
export function CommitCard({ commit: c, open, onToggle, selected, onSelect }: CommitCardProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(commitToText(c));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("bg-panel rounded-xl border p-4", selected && "border-[#274d34]")}>
      <div className="mb-2 flex items-center gap-2.5">
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            title={selected ? "Seçimi kaldır" : "Seç"}
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
              selected
                ? "border-[#274d34] bg-[#1b2f22] text-accent-green"
                : "text-transparent hover:border-[#3a4450]",
            )}
          >
            <Check className="size-3" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "text-muted-foreground transition-transform",
            open && "text-accent-green rotate-90",
          )}
        >
          <ChevronRight className="size-3.5" />
        </button>
        <span className="text-accent-green rounded bg-[#152318] px-2 py-0.5 font-mono text-[11px]">
          {c.sha.slice(0, 7)}
        </span>
        <span className="rounded-full bg-[#1b222a] px-2.5 py-0.5 font-mono text-[11px] text-[#8b93a0]">
          {c.project}
        </span>
        {c.area !== "other" ? (
          <span className="rounded-full bg-[#1b222a] px-2.5 py-0.5 font-mono text-[11px] text-[#8b93a0]">
            {c.area}
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="text-muted-foreground font-mono text-[11px]">{clockOf(c.committedAt)}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-muted-foreground hover:text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="text-foreground mb-2.5 block text-left text-[13.5px] leading-snug"
      >
        {c.message}
      </button>

      {open && c.body ? (
        <div className="mb-3 rounded-r-lg border-l-2 border-[#274d34] bg-[#0f1418] px-4 py-3">
          <div className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-wider uppercase">
            açıklama
          </div>
          <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#b9c0ca]">
            {c.body}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3.5">
        <span className="text-accent-green font-mono text-[11.5px]">+{c.additions}</span>
        <span className="text-destructive font-mono text-[11.5px]">−{c.deletions}</span>
        <span className="text-muted-foreground font-mono text-[11.5px]">{c.filesChanged} dosya</span>
        <DiffBar additions={c.additions} deletions={c.deletions} />
        <span className="flex-1" />
        {c.paths.slice(0, 2).map((p) => (
          <span
            key={p}
            className="text-muted-foreground rounded border bg-[#0f1418] px-2 py-0.5 font-mono text-[11px]"
          >
            {p.split("/").pop()}
          </span>
        ))}
      </div>
    </div>
  );
}
