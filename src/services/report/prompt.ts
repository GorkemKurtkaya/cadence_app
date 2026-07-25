import type {
  CommitInfo,
  ReportLength,
  ReportPeriod,
  ReportSections,
  ReportTone,
} from "@/types";
import { summarizeFiles } from "@/services/git/parseGitLog";

export interface ReportOptions {
  sections: ReportSections;
  customInstructions: string;
  /** Doluysa yapılandırılmış prompt yerine bu şablon (değişken ikamesiyle) kullanılır. */
  template?: string;
  period?: ReportPeriod;
  length?: ReportLength;
  tone?: ReportTone;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  sections: { summary: true, standup: true, technical: true },
  customInstructions: "",
};

/** Şablonda kullanılabilir değişkenler (Ayarlar'da chip olarak gösterilir). */
export const PROMPT_VARS = [
  "{{periyot}}",
  "{{tarih_araligi}}",
  "{{proje_listesi}}",
  "{{commit_listesi}}",
  "{{istatistikler}}",
  "{{uzunluk}}",
  "{{ton}}",
] as const;

/** Düzenlenebilir varsayılan rapor promptu (tasarımdaki promptText). */
export const DEFAULT_PROMPT_TEMPLATE = `Sen benim geliştirici günlüğümü yazan asistanımsın. Aşağıdaki commitlere bakarak {{periyot}} rapor yaz.

KURALLAR
- Birinci tekil şahıs, kendi ağzımdan yaz ("Bugün ... ekledim", "... hatasını çözdüm").
- Her commit'in hem BAŞLIĞINI hem AÇIKLAMASINI (body) oku; asıl detay açıklamada, sadece başlığa bakma.
- Teknik jargonu sadeleştir; yaptığım işin NE İŞE YARADIĞINI anlat.
- Uzunluk: {{uzunluk}} · Ton: {{ton}}

FORMAT
1. Tek cümlelik özet (günün ana teması).
2. Her proje için ayrı başlık: proje adı, altında Backend / Frontend alt başlıkları.
3. Maddeler kısa ve sonuç odaklı olsun; commit hash yazma.
4. Sonunda "Yarın" başlığıyla 1–2 cümlelik plan.

VERİ
Tarih: {{tarih_araligi}}
Projeler: {{proje_listesi}}
İstatistik: {{istatistikler}}
Commitler:
{{commit_listesi}}`;

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: "günlük",
  weekly: "haftalık",
  monthly: "aylık",
  yearly: "yıllık",
};

const LENGTH_LABELS: Record<ReportLength, string> = {
  short: "kısa",
  medium: "orta",
  detailed: "detaylı",
};

/** Yaklaşık token tahmini (~4 karakter/token) — Ayarlar'daki sayaç için. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/** Şablondaki {{değişken}}'leri commit bağlamıyla doldurur. Saf fonksiyon. */
export function renderTemplate(
  template: string,
  reportDate: string,
  commits: CommitInfo[],
  opts: { period?: ReportPeriod; length?: ReportLength; tone?: ReportTone } = {},
): string {
  const projects = [...new Set(commits.map((c) => c.project || c.repoName))];
  const additions = commits.reduce((n, c) => n + c.additions, 0);
  const deletions = commits.reduce((n, c) => n + c.deletions, 0);
  const values: Record<string, string> = {
    "{{periyot}}": PERIOD_LABELS[opts.period ?? "daily"],
    "{{tarih_araligi}}": reportDate,
    "{{proje_listesi}}": projects.join(", ") || "(yok)",
    "{{commit_listesi}}": renderCommitsForPrompt(commits),
    "{{istatistikler}}": `${commits.length} commit · +${additions} / -${deletions} satır`,
    "{{uzunluk}}": LENGTH_LABELS[opts.length ?? "detailed"],
    "{{ton}}": opts.tone?.trim() || "nötr",
  };
  return template.replace(/\{\{[^}]+\}\}/g, (m) => values[m] ?? m);
}

/** Rapor bölümlerini ayrıştırmak için kullanılan sabit işaretçiler. */
export const SECTION_MARKERS = {
  summary: "===OZET===",
  standup: "===STANDUP===",
  technical: "===TEKNIK===",
} as const;

/** İnsan-okur tarih (prompt içi bağlam için). */
function formatDateTr(isoDate: string): string {
  return isoDate; // YYYY-MM-DD yeterli; yerelleştirme UI'da yapılır
}

/** Commit listesini proje/katman gruplu, body dahil prompt gövdesine çevirir. */
export function renderCommitsForPrompt(commits: CommitInfo[]): string {
  if (commits.length === 0) return "(Bu güne ait commit bulunamadı.)";

  // Proje → katman → commit'ler
  const byProject = new Map<string, CommitInfo[]>();
  for (const c of commits) {
    const key = c.project || c.repoName;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(c);
  }

  const blocks: string[] = [];
  for (const [project, projectCommits] of byProject) {
    blocks.push(`## PROJE: ${project}`);
    const byLayer = new Map<string, CommitInfo[]>();
    for (const c of projectCommits) {
      if (!byLayer.has(c.layer)) byLayer.set(c.layer, []);
      byLayer.get(c.layer)!.push(c);
    }
    for (const [layer, layerCommits] of byLayer) {
      blocks.push(`### KATMAN: ${layer}`);
      for (const c of layerCommits) {
        const time = c.committedAt.slice(11, 16) || "??:??";
        const parts = [
          `- [${time}] Konu: ${c.message}`,
          c.body ? `  Açıklama: ${c.body.replace(/\n/g, "\n  ")}` : "",
          `  Değişim: ${c.filesChanged} dosya (+${c.additions}/-${c.deletions})`,
          c.files.length ? `  Dosyalar:\n${summarizeFiles(c.files)}` : "",
        ].filter(Boolean);
        blocks.push(parts.join("\n"));
      }
    }
  }
  return blocks.join("\n");
}

/**
 * Günün commit'lerinden Claude için 3 bölümlü rapor prompt'u kurar.
 * Saf fonksiyondur — I/O yok, test edilir.
 */
export function buildReportPrompt(
  reportDate: string,
  commits: CommitInfo[],
  options: ReportOptions = DEFAULT_REPORT_OPTIONS,
): string {
  // Kullanıcı özel şablon tanımladıysa serbest-biçim template modunu kullan.
  const tpl = options.template?.trim();
  if (tpl) {
    const rendered = renderTemplate(tpl, reportDate, commits, {
      period: options.period,
      length: options.length,
      tone: options.tone,
    });
    const extra = options.customInstructions.trim()
      ? `\n\nEK TALİMATLAR:\n${options.customInstructions.trim()}`
      : "";
    return rendered + extra;
  }

  const repoNames = [...new Set(commits.map((c) => c.repoName))];
  const { sections, customInstructions } = options;

  // İstenen bölümleri, işaretçi + açıklamasıyla dinamik kur.
  const sectionDefs: Array<{ on: boolean; marker: string; desc: string }> = [
    {
      on: sections.summary,
      marker: SECTION_MARKERS.summary,
      desc: `Bugün yapılan işlerin özeti. ŞU FORMATTA yaz:
   - Commit'leri PROJEYE göre grupla. Her proje bir "## Proje Adı" başlığı olsun.
   - Her projenin altında ilgili katman(lar)ı "### Backend" / "### Frontend" alt başlığıyla ayır (o katmanda iş varsa).
   - Her madde, o iş biriminde NE yapıldığını anlatan TEK, düz, doğal bir Türkçe cümle olsun (geçmiş zaman, ben dili: "...ekledim", "...düzelttim", "...çözdüm").
   - Cümleyi commit KONUSU + AÇIKLAMASI + değişen dosyalara bakarak yaz; ham commit mesajını olduğu gibi kopyalama, teknik jargonu sadeleştir ama doğru kal.
   - İlişkili birkaç commit'i tek anlamlı maddede birleştirebilirsin. Emoji kullanma.
   Örnek biçim:
   ## Fastdrama
   ### Backend
   - Stripe ödemelerinde tutarların 100 kat fazla görünmesi hatasını (cent/dolar) kökünden çözdüm.
   - Bedava kredi miktarını koda gömmekten çıkarıp veritabanına bağladım.
   ### Frontend
   - Dashboard'a "Giriş Trendleri" ve "Kredi Ekonomisi" grafiklerini ekledim.`,
    },
    {
      on: sections.standup,
      marker: SECTION_MARKERS.standup,
      desc: "Ekip standup formatı: **Dün/Bugün yapılanlar**, **Sıradaki adımlar**, **Engeller** (yoksa \"yok\").",
    },
    {
      on: sections.technical,
      marker: SECTION_MARKERS.technical,
      desc: "Teknik değişim günlüğü: hangi repolarda ne değişti, önemli dosyalar/refactor'lar, dikkat çeken mimari kararlar. Gelecekte \"neden böyle yapmışım\" sorusuna cevap verecek netlikte.",
    },
  ];
  const active = sectionDefs.filter((s) => s.on);
  // Hiç bölüm seçilmemişse en azından özeti üret.
  const chosen = active.length > 0 ? active : [sectionDefs[0]];

  const markerList = chosen.map((s) => `  ${s.marker}`).join("\n");
  const sectionList = chosen
    .map((s, i) => `${i + 1}) ${s.marker}\n   ${s.desc}`)
    .join("\n");

  const extra = customInstructions.trim()
    ? `\nEK TALİMATLAR (kullanıcıdan):\n${customInstructions.trim()}\n`
    : "";

  return `Sen bir yazılım geliştiricinin günlük çalışma asistanısın. Aşağıda ${formatDateTr(
    reportDate,
  )} tarihinde yapılan git commit'leri var. Bunlardan Türkçe bir GÜNLÜK RAPOR üret.

Kurallar:
- Çıktı SADECE markdown olsun, başka açıklama ekleme.
- Bölümleri tam olarak aşağıdaki işaretçilerle ayır (işaretçileri birebir yaz):
${markerList}
- Yalnızca istenen bölümleri üret, fazladan bölüm ekleme.
- Uydurma yapma; yalnızca commit verisine dayan. Veri azsa kısa yaz.
${extra}
Bölümler:
${sectionList}

Bağlam: Repolar: ${repoNames.join(", ") || "(yok)"}. Toplam ${commits.length} commit.

--- COMMIT VERİSİ ---
${renderCommitsForPrompt(commits)}
--- COMMIT VERİSİ SONU ---

Şimdi raporu üret. İlk satır ${chosen[0].marker} olmalı.`;
}
