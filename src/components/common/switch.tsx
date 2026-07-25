import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/** Stilize toggle switch (shadcn ui/ değiştirilmeden). */
export function Switch({ checked, onChange, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        checked ? "bg-accent-green border-[#274d34]" : "bg-[#161b21] border-input",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Etiket + açıklama solda, switch sağda — ayar satırı. */
export function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-foreground text-[13px]">{label}</div>
        {hint ? <div className="text-muted-foreground text-xs">{hint}</div> : null}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}
