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

/** Düzenlenebilir varsayılan rapor promptu (release-notes / changelog tarzı, few-shot örnekli). */
export const DEFAULT_PROMPT_TEMPLATE = `Sen bir yazılım geliştiricinin çalışma asistanısın. Aşağıdaki git commit'lerine bakarak release-notes / changelog tarzında, "aptala anlatır gibi" kısa ve net bir {{periyot}} rapor üret.

KURALLAR
- Her commit'in hem başlığını hem açıklamasını (body) oku; asıl detay açıklamada, sadece başlığa bakma.
- Commit'leri projeye göre grupla. Her proje kendi adıyla ayrı bir satır başlığı olsun.
- Her projenin altında ilgili katmanı "Backend" / "Frontend" satırıyla ayır (yalnız o katmanda iş varsa).
- Her madde şu kalıpta olsun: "Kısa Özellik Adı: özelliğin ne yaptığını / ne işe yaradığını anlatan net açıklama." Yani 2-4 kelimelik özellik adı + iki nokta + açıklama.
- Etiket, özelliğin kısa ve anlaşılır adı olsun (ör. Taslak Yönetimi, Canlı Aktivite Paneli, Liste Dolgusu).
- Açıklamayı edilgen / nötr yaz ("...eklendi", "...kuruldu", "...hale getirildi", "...entegre edildi") — ben dili kullanma ("ekledim" deme).
- Teknik jargonu sadeleştir, teknik olmayan biri de anlasın; ama teknik olarak doğru kal. Ham commit mesajını kopyalama; cümleyi commit konusu + açıklaması + değişen dosyalara bakarak kur.
- Hiçbir anlamlı özellik atlanmasın; kısa tut ama her işi kapsa. İlişkili küçük commit'leri tek maddede birleştirebilirsin.
- Küçük hata düzeltmelerini tek maddede topla: "Hata Çözümleri: ... giderildi, ... eklendi, ... çözüldü."
- Açıklamaların uzunluğu şu kurala uysun → Uzunluk: {{uzunluk}} · Ton: {{ton}}
- ÇOK ÖNEMLİ: Markdown KULLANMA. ##, **, > veya benzeri işaret yok. Sadece düz metin. Başlıklar düz satır, maddeler tek "- " ile başlasın.

ÖRNEK BİÇİM (yalnızca gruplama ve satır biçimini gösterir; maddelerin UZUNLUĞUNU örnekten değil, yukarıdaki Uzunluk kuralından al — bu örnekteki maddeler "orta" uzunluktadır, "kısa" seçiliyse çok daha kısa yaz)
Novelify
Backend
- Taslak Yönetimi: Adminlere, yazarların taslak bölümlerini doğrudan düzenleme, silme ve sıralama yetkisi eklendi.
- Liste Dolgusu: "Çok Satanlar" gibi eksik kalabilen sıralama listelerini en çok okunanlarla 50'ye tamamlayan bir mantık kuruldu.

Frontend
- Görsel Canlı Akış: Canlı etkinlik ekranındaki düz metinler; kitap kapağı, okuma yüzdesi çubuğu ve paket rozetleriyle görselleştirildi.

Fastdrama
Frontend
- Canlı Aktivite Paneli: Anlık kullanıcı hareketlerini ve bulundukları ekranları saniye saniye gösteren canlı izleme sayfası eklendi.
- Hata Çözümleri: Çeviri hataları giderildi, kopan canlı bağlantılara oto-yeniden bağlanma eklendi, render sorunları çözüldü.

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
  short:
    "kısa — her madde ÇOK kısa, yaklaşık 4-10 kelime: 'Kısa Özellik Adı: birkaç kelimelik özet.' TAM CÜMLE KURMA; 've / ile / ayrıca' ile uzatma; ayrıntı, örnek, gerekçe verme; ilişkili işleri tek maddede birleştir. Örnek madde: 'Anlık Online Kullanıcı: canlı bağlı kullanıcı bandı eklendi.'",
  medium:
    "orta — her madde tek ama DOLU bir cümle: özelliğin ne olduğunu ve ne işe yaradığını gerekli birkaç ayrıntıyla anlatsın (ne kısacık, ne paragraf). Örnek madde: 'Canlı Platform Paneli: şu an izleyen, uygulamada olan ve son 15 dakikadaki satın alımları canlı gösteren bir ana panel eklendi.'",
  detailed:
    "detaylı — her özelliği enine boyuna aç: ne yapıldı, neden yapıldı, nasıl çalışıyor ve etkisi ne; gerektiğinde birden fazla cümle ve somut örnekler kullan",
};

/** Yaklaşık token tahmini (~4 karakter/token) — Ayarlar'daki sayaç için. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/**
 * Prompt'un EN SONUNA eklenen, örnek biçimden ve custom template'ten daha öncelikli
 * zorunlu kurallar bloğu. Kullanıcının kayıtlı promptu `{{uzunluk}}` değişkenini içermese
 * bile uzunluk ve Backend/Frontend ayrımı böylece HER ZAMAN uygulanır. Saf fonksiyon.
 */
export function buildHardRules(length: ReportLength): string {
  return `

==== ZORUNLU KURALLAR (yukarıdaki her şeyden ve örnek maddelerin uzunluğundan DAHA ÖNCELİKLİ) ====
1) UZUNLUK — ${LENGTH_LABELS[length]}
   Örnek biçimdeki maddeler uzun olsa bile SEN bu uzunluğa uy; uzunluk seçimi diğer her şeyin önünde gelir.
2) GRUPLAMA — Her projeyi kendi başlığı altında topla; o projenin işlerini ayrı "Backend" ve "Frontend" alt satırlarına AYIR (yalnız o katmanda iş varsa). Backend ve frontend maddelerini aynı listede karıştırma. Aynı projede Backend bloğu ile Frontend bloğu ARASINA bir BOŞ SATIR koy.`;
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
    // Uzunluk + Backend/Frontend ayrımını, template değişken içermese bile sonda garanti et.
    return rendered + extra + buildHardRules(options.length ?? "detailed");
  }

  const repoNames = [...new Set(commits.map((c) => c.repoName))];
  const { sections, customInstructions } = options;

  // İstenen bölümleri, işaretçi + açıklamasıyla dinamik kur.
  const sectionDefs: Array<{ on: boolean; marker: string; desc: string }> = [
    {
      on: sections.summary,
      marker: SECTION_MARKERS.summary,
      desc: `Bugünkü işlerin kısa özeti. Commit'leri projeye göre grupla; her proje kendi adıyla düz bir başlık satırı olsun, altında yapılan işleri "- " ile madde madde yaz. Sade ve anlaşılır tut, teknik jargonu sadeleştir. Markdown kullanma (##, ** yok), sadece düz metin.`,
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
