import { useEffect, useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, RotateCcw, FolderPlus, X, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SwitchRow } from "@/components/common/switch";
import { SecretField } from "./components/secrets-form";
import { useSettings, useSaveSettings, useToolStatus } from "@/hooks/queries/use-settings";
import { settingsFormSchema, parseRepoRoots, type SettingsFormValues } from "@/lib/validations/settings";
import { DEFAULT_PROMPT_TEMPLATE, PROMPT_VARS, estimateTokens } from "@/services/report/prompt";
import { pickDirectory } from "@/services/dialog";
import { cn } from "@/lib/utils";

const chip = "rounded-md border px-3.5 py-2 font-mono text-[13px] transition-colors cursor-pointer";
const chipActive = "border-[#274d34] bg-[#1b2f22] text-accent-green";
const chipIdle = "bg-[#161b21] text-[#7b828f] hover:text-foreground";

function Panel({
  title,
  desc,
  badge,
  children,
}: {
  title: string;
  desc?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-panel rounded-xl border p-5.5">
      <div className="flex items-center justify-between">
        <div className="text-foreground text-[15px] font-semibold">{title}</div>
        {badge}
      </div>
      {desc ? <div className="text-muted-foreground mt-1 mb-4.5 text-[12.5px]">{desc}</div> : <div className="mb-4.5" />}
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const { data: status, refetch: refetchStatus, isFetching: statusFetching } = useToolStatus();
  const [advOpen, setAdvOpen] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      repoRootsText: "",
      claudeMode: "cli",
      model: "claude-sonnet-5",
      githubEnabled: false,
      githubUsername: "",
      scanAllBranches: true,
      onlyMyCommits: true,
      sectionSummary: true,
      sectionStandup: true,
      sectionTechnical: true,
      customInstructions: "",
      defaultPeriod: "daily",
      defaultLength: "detailed",
      defaultTone: "",
      promptTemplate: "",
    },
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      repoRootsText: settings.repoRoots.join("\n"),
      claudeMode: settings.claudeMode,
      model: settings.model,
      githubEnabled: settings.githubEnabled,
      githubUsername: settings.githubUsername,
      scanAllBranches: settings.scanAllBranches,
      onlyMyCommits: settings.onlyMyCommits,
      sectionSummary: settings.reportSections.summary,
      sectionStandup: settings.reportSections.standup,
      sectionTechnical: settings.reportSections.technical,
      customInstructions: settings.customInstructions,
      defaultPeriod: settings.defaultPeriod,
      defaultLength: settings.defaultLength,
      defaultTone: settings.defaultTone,
      promptTemplate: settings.promptTemplate,
    });
  }, [settings, form]);

  const onSubmit = (v: SettingsFormValues) => {
    save.mutate(
      {
        repoRoots: parseRepoRoots(v.repoRootsText),
        claudeMode: v.claudeMode,
        model: v.model,
        githubEnabled: v.githubEnabled,
        githubUsername: v.githubUsername.trim(),
        scanAllBranches: v.scanAllBranches,
        onlyMyCommits: v.onlyMyCommits,
        reportSections: {
          summary: v.sectionSummary,
          standup: v.sectionStandup,
          technical: v.sectionTechnical,
        },
        customInstructions: v.customInstructions,
        defaultPeriod: v.defaultPeriod,
        defaultLength: v.defaultLength,
        defaultTone: v.defaultTone,
        promptTemplate: v.promptTemplate.trim(),
      },
      {
        onSuccess: () => toast.success("Ayarlar kaydedildi."),
        onError: () => toast.error("Ayarlar kaydedilemedi."),
      },
    );
  };

  // Chip grubu — bir enum form alanını buton grubuna bağlar.
  function Chips<T extends string>({
    name,
    options,
    full,
  }: {
    name: Path<SettingsFormValues>;
    options: Array<{ value: T; label: string }>;
    full?: boolean;
  }) {
    const value = form.watch(name);
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => form.setValue(name, o.value as never, { shouldDirty: true })}
            className={cn(chip, full && "flex-1 text-center", value === o.value ? chipActive : chipIdle)}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const claudeMode = form.watch("claudeMode");
  const template = form.watch("promptTemplate");
  const effectiveTemplate = template?.trim() ? template : DEFAULT_PROMPT_TEMPLATE;
  const roots = parseRepoRoots(form.watch("repoRootsText"));

  const ready = claudeMode === "api" ? Boolean(status?.hasApiKey) : Boolean(status?.cliAvailable);

  const addRoot = async () => {
    const dir = await pickDirectory();
    if (!dir) return;
    if (roots.includes(dir)) {
      toast.info("Bu klasör zaten ekli.");
      return;
    }
    form.setValue("repoRootsText", [...roots, dir].join("\n"), { shouldDirty: true });
  };
  const removeRoot = (dir: string) => {
    form.setValue("repoRootsText", roots.filter((r) => r !== dir).join("\n"), { shouldDirty: true });
  };

  const insertVar = (v: string) => {
    const cur = form.getValues("promptTemplate") || DEFAULT_PROMPT_TEMPLATE;
    form.setValue("promptTemplate", `${cur}${!cur || cur.endsWith("\n") ? "" : " "}${v}`, {
      shouldDirty: true,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex max-w-[860px] flex-col gap-4 p-6">
      {/* Claude Bağlantısı */}
      <Panel title="Claude Bağlantısı" desc="Raporlar bu bağlantı üzerinden üretilir.">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Bağlantı türü</Label>
            <Chips
              name="claudeMode"
              options={[
                { value: "cli", label: "Yerel claude CLI" },
                { value: "api", label: "Anthropic API" },
              ]}
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input placeholder="claude-sonnet-5" className="font-mono" {...form.register("model")} />
            <p className="text-muted-foreground mt-1.5 text-xs">API modunda kullanılır (ör. claude-sonnet-5).</p>
          </div>

          {claudeMode === "api" ? (
            <SecretField
              name="anthropicApiKey"
              label="Anthropic API anahtarı"
              placeholder="sk-ant-…"
              hint="Yerelde saklanır, ekranda gösterilmez. Kaydettikten sonra alan temizlenir."
            />
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusFetching}
            >
              {statusFetching ? <RefreshCw className="size-4 animate-spin" /> : null}
              Bağlantıyı test et
            </Button>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "size-2 rounded-full",
                  ready ? "bg-accent-green shadow-[0_0_8px_var(--accent-green)]" : "bg-muted-foreground",
                )}
              />
              <span className={ready ? "text-accent-green" : "text-muted-foreground"}>
                {ready
                  ? claudeMode === "api"
                    ? "API anahtarı hazır"
                    : "claude CLI bağlı"
                  : claudeMode === "api"
                    ? "API anahtarı yok"
                    : "claude CLI bulunamadı"}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Rapor Promptu */}
      <Panel
        title="Rapor Promptu"
        desc="Raporun formatını ve üslubunu burada anlat. Değişkenler üretim sırasında otomatik doldurulur."
        badge={
          <span className="text-accent-green rounded-full bg-[#152318] px-2.5 py-1 font-mono text-[11px]">
            claude'a gönderilir
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PROMPT_VARS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="rounded-md border border-[#274d34] bg-[#152318] px-2.5 py-1 font-mono text-[11px] text-[#8bd6a8]"
            >
              {v}
            </button>
          ))}
        </div>
        <Textarea
          rows={12}
          className="min-h-[220px] bg-[#0b0f13] font-mono text-[12.5px] leading-relaxed"
          placeholder={DEFAULT_PROMPT_TEMPLATE}
          {...form.register("promptTemplate")}
        />
        <div className="mt-3 flex items-center gap-2">
          <Button type="submit" size="sm" disabled={save.isPending}>
            <Save className="size-4" />
            Kaydet
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => form.setValue("promptTemplate", DEFAULT_PROMPT_TEMPLATE, { shouldDirty: true })}
          >
            <RotateCcw className="size-4" />
            Varsayılana dön
          </Button>
          <span className="flex-1" />
          <span className="text-muted-foreground font-mono text-[11.5px]">
            ~{estimateTokens(effectiveTemplate)} token
          </span>
        </div>
      </Panel>

      {/* Rapor Varsayılanları */}
      <Panel title="Rapor Varsayılanları" desc="Rapor Üret paneli bu değerlerle açılır.">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Varsayılan periyot</Label>
            <Chips
              name="defaultPeriod"
              options={[
                { value: "daily", label: "Günlük" },
                { value: "weekly", label: "Haftalık" },
                { value: "monthly", label: "Aylık" },
                { value: "yearly", label: "Yıllık" },
              ]}
            />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <Label>Uzunluk</Label>
              <Chips
                name="defaultLength"
                full
                options={[
                  { value: "short", label: "Kısa" },
                  { value: "medium", label: "Orta" },
                  { value: "detailed", label: "Detaylı" },
                ]}
              />
            </div>
            <div className="flex-1">
              <Label>Ton</Label>
              <Input placeholder="Kendi ağzımdan, samimi" {...form.register("defaultTone")} />
            </div>
          </div>

          <div>
            <Label>İzlenen projeler</Label>
            <div className="flex flex-col gap-2">
              {roots.map((r) => (
                <div
                  key={r}
                  className="flex items-center gap-2.5 rounded-lg border bg-[#0f1418] px-3.5 py-2.5"
                >
                  <span className="text-accent-green">●</span>
                  <span className="text-foreground min-w-0 flex-1 truncate font-mono text-[12.5px]">{r}</span>
                  <button
                    type="button"
                    onClick={() => removeRoot(r)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Kaldır"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoot}
                className="text-muted-foreground hover:text-accent-green flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-[12.5px] transition-colors"
              >
                <FolderPlus className="size-4" />
                Klasör seç
              </button>
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Seçtiğin klasörlerin altındaki git repoları otomatik bulunur.
            </p>
          </div>
        </div>
      </Panel>

      {/* Gelişmiş */}
      <div className="bg-panel rounded-xl border p-5.5">
        <button
          type="button"
          onClick={() => setAdvOpen((o) => !o)}
          className="flex w-full items-center justify-between"
        >
          <div className="text-left">
            <div className="text-foreground text-[15px] font-semibold">Gelişmiş</div>
            <div className="text-muted-foreground mt-1 text-[12.5px]">
              GitHub, tarama ve yapılandırılmış rapor bölümleri.
            </div>
          </div>
          <ChevronDown className={cn("text-muted-foreground size-5 transition-transform", advOpen && "rotate-180")} />
        </button>

        {advOpen ? (
          <div className="mt-5 flex flex-col gap-5">
            <div>
              <Label>GitHub</Label>
              <Input placeholder="kullanıcı adın" {...form.register("githubUsername")} />
              <div className="mt-3">
                <SwitchRow
                  label="GitHub entegrasyonunu aç"
                  hint="O günün GitHub commit'leri de rapora katılır."
                  checked={Boolean(form.watch("githubEnabled"))}
                  onChange={(c) => form.setValue("githubEnabled", c, { shouldDirty: true })}
                />
              </div>
              <div className="mt-3">
                <SecretField
                  name="githubToken"
                  label="GitHub token"
                  placeholder="ghp_…"
                  hint="gh CLI yoksa alternatif. Yerelde saklanır."
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-3">
              <Label>Tarama</Label>
              <SwitchRow
                label="Tüm branch'leri tara"
                hint="Feature/PR branch'lerindeki commit'ler de sayılır."
                checked={Boolean(form.watch("scanAllBranches"))}
                onChange={(c) => form.setValue("scanAllBranches", c, { shouldDirty: true })}
              />
              <SwitchRow
                label="Sadece benim commit'lerim"
                hint="Reponun git email'iyle atılanlar; ekip commit'lerini dışlar."
                checked={Boolean(form.watch("onlyMyCommits"))}
                onChange={(c) => form.setValue("onlyMyCommits", c, { shouldDirty: true })}
              />
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-3">
              <div>
                <Label>Yapılandırılmış rapor bölümleri</Label>
                <p className="text-muted-foreground -mt-1 mb-1 text-xs">
                  Özel prompt boşsa bu bölümler üretilir.
                </p>
              </div>
              <SwitchRow
                label="📝 Özet / Günlük"
                checked={Boolean(form.watch("sectionSummary"))}
                onChange={(c) => form.setValue("sectionSummary", c, { shouldDirty: true })}
              />
              <SwitchRow
                label="👔 Standup"
                checked={Boolean(form.watch("sectionStandup"))}
                onChange={(c) => form.setValue("sectionStandup", c, { shouldDirty: true })}
              />
              <SwitchRow
                label="🔧 Teknik günlük"
                checked={Boolean(form.watch("sectionTechnical"))}
                onChange={(c) => form.setValue("sectionTechnical", c, { shouldDirty: true })}
              />
              <div>
                <Label>Ek talimatlar (opsiyonel)</Label>
                <Textarea
                  rows={2}
                  placeholder="örn. Daha kısa yaz, emoji kullanma…"
                  {...form.register("customInstructions")}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <Button type="submit" disabled={save.isPending}>
          <Save className="size-4" />
          Tümünü Kaydet
        </Button>
      </div>
    </form>
  );
}
