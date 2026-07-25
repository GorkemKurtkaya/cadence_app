import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveSecret } from "@/hooks/queries/use-settings";

type SecretName = "anthropicApiKey" | "githubToken";

/**
 * Tek bir sır alanı (password + Kaydet). Yerelde saklanır, ekranda gösterilmez,
 * kaydettikten sonra alan temizlenir. Ayarlar kartlarında yeniden kullanılır.
 */
export function SecretField({
  name,
  label,
  placeholder,
  hint,
}: {
  name: SecretName;
  label: string;
  placeholder: string;
  hint?: string;
}) {
  const [value, setValue] = useState("");
  const save = useSaveSecret();

  const onSave = () => {
    if (!value.trim()) return;
    save.mutate(
      { name, value: value.trim() },
      {
        onSuccess: () => {
          setValue("");
          toast.success(`${label} kaydedildi.`);
        },
        onError: () => toast.error(`${label} kaydedilemedi.`),
      },
    );
  };

  return (
    <div>
      <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
        {label}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        <Button variant="secondary" onClick={onSave} disabled={!value.trim() || save.isPending}>
          <Save className="size-4" />
          Kaydet
        </Button>
      </div>
      {hint ? <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p> : null}
    </div>
  );
}
