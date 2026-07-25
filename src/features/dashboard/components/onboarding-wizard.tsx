import { useState } from "react";
import { toast } from "sonner";
import {
  FolderPlus,
  DownloadCloud,
  Loader2,
  ArrowRight,
  GitCommitHorizontal,
  Check,
  X,
} from "lucide-react";
import { useSettings, useSaveSettings } from "@/hooks/queries/use-settings";
import { useScanCommits } from "@/hooks/queries/use-commits";
import { pickDirectory } from "@/services/dialog";
import { todayKey } from "@/lib/date";
import { PULL_PRESETS, presetToRange, type PullPreset } from "@/lib/pull-presets";
import { cn } from "@/lib/utils";

const chip = "rounded-md border px-3 py-1.5 font-mono text-xs transition-colors";
const chipActive = "border-[#274d34] bg-[#1b2f22] text-accent-green";
const chipIdle = "bg-[#161b21] text-[#7b828f] hover:text-foreground";

// İlk taramada makul bir varsayılan: son 90 gün (indeks 2).
const DEFAULT_PRESET = PULL_PRESETS[2];

type Step = "folder" | "pull";

/**
 * Boş durumda kullanıcıyı ilk taramaya götüren sihirbaz:
 * klasör seç → commitleri çekelim mi + aralık → tarama. Mevcut servisleri yeniden kullanır.
 */
export function OnboardingWizard() {
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();
  const scan = useScanCommits();
  const today = todayKey();

  const roots = settings?.repoRoots ?? [];
  const [step, setStep] = useState<Step>("folder");
  const [preset, setPreset] = useState<PullPreset>(DEFAULT_PRESET);

  const addRoot = async () => {
    const dir = await pickDirectory();
    if (!dir) return;
    if (roots.includes(dir)) {
      toast.info("Bu klasör zaten ekli.");
      return;
    }
    await saveSettings.mutateAsync({ repoRoots: [...roots, dir] });
  };

  const removeRoot = async (dir: string) => {
    await saveSettings.mutateAsync({ repoRoots: roots.filter((r) => r !== dir) });
  };

  const runPull = () => {
    const { scanFrom, to } = presetToRange(preset, today);
    scan.mutate(
      { from: scanFrom, to },
      {
        onSuccess: (res) => {
          // Başarı sonrası: commits + stats invalidate edilir → Dashboard otomatik dolar.
          toast.success(`${res.commits.length} commit çekildi · ${preset.label}`);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Commitler çekilemedi");
        },
      },
    );
  };

  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-xl border border-dashed px-6 py-12 text-center">
        <div className="text-accent-green [&_svg]:size-8">
          <GitCommitHorizontal />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Başlayalım</p>
          <p className="text-muted-foreground text-sm">
            {step === "folder"
              ? "Repolarının bulunduğu klasörü seç; altındaki tüm git repoları otomatik bulunur."
              : "Bu klasörlerden geçmiş commitleri içeri alalım. Ne kadar geriye gidelim?"}
          </p>
        </div>

        {step === "folder" ? (
          <FolderStep
            roots={roots}
            busy={saveSettings.isPending}
            onAdd={addRoot}
            onRemove={removeRoot}
            onContinue={() => setStep("pull")}
          />
        ) : (
          <PullStep
            roots={roots}
            preset={preset}
            onPreset={setPreset}
            scanning={scan.isPending}
            onBack={() => setStep("folder")}
            onPull={runPull}
          />
        )}
      </div>
    </div>
  );
}

function FolderStep({
  roots,
  busy,
  onAdd,
  onRemove,
  onContinue,
}: {
  roots: string[];
  busy: boolean;
  onAdd: () => void;
  onRemove: (dir: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {roots.length > 0 && (
        <div className="flex flex-col gap-2">
          {roots.map((r) => (
            <div
              key={r}
              className="flex items-center gap-2.5 rounded-lg border bg-[#0f1418] px-3.5 py-2.5"
            >
              <span className="text-accent-green">●</span>
              <span className="text-foreground min-w-0 flex-1 truncate text-left font-mono text-[12.5px]">
                {r}
              </span>
              <button
                type="button"
                onClick={() => onRemove(r)}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-50"
                aria-label="Kaldır"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="text-muted-foreground hover:text-accent-green flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-[12.5px] transition-colors disabled:opacity-60"
      >
        <FolderPlus className="size-4" />
        {roots.length > 0 ? "Başka klasör ekle" : "Repo klasörünü seç"}
      </button>

      <button
        type="button"
        onClick={onContinue}
        disabled={roots.length === 0 || busy}
        className="text-accent-green flex items-center justify-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Devam
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

function PullStep({
  roots,
  preset,
  onPreset,
  scanning,
  onBack,
  onPull,
}: {
  roots: string[];
  preset: PullPreset;
  onPreset: (p: PullPreset) => void;
  scanning: boolean;
  onBack: () => void;
  onPull: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="text-muted-foreground text-left font-mono text-[11.5px]">
        {roots.length} klasör · altındaki git repoları taranacak
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {PULL_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPreset(p)}
            disabled={scanning}
            className={cn(chip, preset.label === p.label ? chipActive : chipIdle, "disabled:opacity-60")}
          >
            {preset.label === p.label && <Check className="mr-1 inline size-3" />}
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={scanning}
          className="text-muted-foreground bg-[#161b21] rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Geri
        </button>
        <button
          type="button"
          onClick={onPull}
          disabled={scanning}
          className="text-accent-green flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#274d34] bg-[#1b2f22] px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <DownloadCloud className="size-4" />}
          {scanning ? "Commitler taranıyor…" : "Commitleri Çek"}
        </button>
      </div>
    </div>
  );
}
