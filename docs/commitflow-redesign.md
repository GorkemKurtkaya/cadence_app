# CommitFlow Redesign

Uygulama, Claude Design'da yeniden kurgulanan **CommitFlow** tasarımına göre komple güncellendi:
koyu terminal estetiği, 6 ekranlı yapı ve dashboard/streak/projeler için **gerçek** (SQLite
commit verisinden hesaplanan) istatistikler. LLM yönü Claude'da kaldı (CLI varsayılan, Anthropic
API opsiyonel).

## Ekranlar

| Route | Ekran | Ne yapar |
|-------|-------|----------|
| `/` | **Dashboard** | Bu hafta commit / değişen satır stat kartları, aktif seri + 21 günlük heatmap, haftalık aktivite bar grafiği, proje dağılımı, son commitler feed'i |
| `/commits` | **Commitlerim** | Arama + proje/alan (be/fe) filtreleri, güne göre gruplu **açılır** commit kartları (açıklama/body, diff bar, dosya chip'leri), tekli/günlük/toplu kopyala |
| `/projects` | **Projeler** | Repo bazlı kartlar: commit/backend/frontend/satır statları + son commit + Rapor Üret |
| `/reports` | **Rapor Geçmişi** | Üretilen raporlar: tarih, periyot/uzunluk rozetleri, kesit, Görüntüle / .md kopyala |
| `/streak` | **Streak** | Şu anki/en uzun seri, toplam aktif gün + 20 haftalık katkı takvimi |
| `/settings` | **Ayarlar** | Claude bağlantısı, düzenlenebilir rapor promptu (değişken chip'leri + token tahmini), rapor varsayılanları, gelişmiş (GitHub/tarama/bölümler) |
| `/report/$date` | Rapor detayı | Kayıtlı günün 3 bölümlü raporu (Görüntüle hedefi) |

Sağ üstteki **Rapor Üret** butonu, sağda 320px'lik bir **drawer** açar: periyot/uzunluk/ton seçilir,
bugünün raporu üretilir, canlı önizleme + Kopyala/.md.

## Mimari

Kural aynı: **tüm sistem erişimi ve iş mantığı `src/services/` içinde**; UI'da doğrudan
git/CLI/dosya/DB çağrısı yok. shadcn/ui korunur (`components/ui/` değiştirilmez), tema token'ları
üzerinden renklendirilir.

### Kabuk — `src/components/layout/`
- `app-shell.tsx` — sidebar · (header + `<Outlet/>`) · report-drawer
- `sidebar.tsx` — CommitFlow logo, 6 nav, Claude bağlantı durum pili
- `header.tsx` — route'a göre başlık/alt başlık, periyot toggle (Gün/Hafta/Ay/Yıl), Rapor Üret
- `report-drawer.tsx` — rapor üretim paneli (Zustand ile kontrol)

### Ortak parçalar — `src/components/common/`
`stat-card`, `contribution-heatmap` (+ legend), `diff-bar`, `commit-card` — her biri tasarım
paletiyle, tekrar kullanılabilir.

### Veri katmanı
- **`services/stats.ts`** — saf agregasyonlar: `computeStreak`, `computeDayActivity`,
  `computeProjectStats`, `groupByDay`, `fillCalendar`, `weeklyBuckets`, `rangeFor` (birim test'li).
- **`services/git/area.ts`** — dosya yollarından `be`/`fe`/`other` alan türetme (test'li).
- **`services/storage.ts`** — yeni sorgular: `getCommitsByRange`, `getRecentCommits`, `listReports`;
  commit okuma artık proje/alan/dosya-yolu ile zenginleştirilmiş `CommitRow` döner.
- **`services/report/prompt.ts`** — düzenlenebilir prompt: `DEFAULT_PROMPT_TEMPLATE`, `PROMPT_VARS`,
  `renderTemplate` (değişken ikamesi), `estimateTokens`. Şablon boşsa eski yapılandırılmış
  (işaretçili 3-bölüm) mod devrede kalır.

### Hooks & state
- `hooks/queries/use-stats.ts` (dashboard + streak), `use-commits.ts`, `use-projects.ts`;
  `use-reports.ts`'e `useReports()` eklendi, üretim `stats`/`commits` key'lerini de invalidate eder.
- `lib/query/keys.ts` factory'e `commits.*` ve `stats.*` eklendi.
- `stores/use-app-store.ts` — drawer, seçili periyot/uzunluk/ton, commit filtreleri (yalnız UI state).

### Ayarlar & şema
- `AppSettings`'e `defaultPeriod / defaultLength / defaultTone / promptTemplate` eklendi.
- `DailyReport`'a `period / length / tone` eklendi → migration
  `src-tauri/migrations/0003_report_meta.sql` (reports tablosuna 3 kolon), `src-tauri/src/lib.rs`'te
  version 3 olarak kayıtlı.

## Tema

`src/globals.css` — shadcn token'ları CommitFlow koyu paletine çekildi (`.dark` default; `<html>`
zaten `class="dark"`). Ek token'lar: `--panel`, `--sidebar`, `--accent-green(-2)`, `--accent-blue`,
`--font-mono`. Fontlar `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` ile **yerelden**
yüklenir (offline; Google Fonts `<link>` yok).

## Çalıştırma & doğrulama

```bash
npm install
npm run tauri dev      # uygulama (Rust toolchain gerekir — kurulu)
npm run build          # tsc + vite (frontend paketi)
npx tsc --noEmit       # tip kontrolü
npm run lint
npm run test           # vitest — stats / area / prompt dahil
```

Doğrulanan durum: `tsc` temiz · `eslint` 0 · `vitest` 43/43 · `vite build` OK · `cargo check` OK.

## Bilinen notlar / kapsam dışı

- **Branch** commit kartlarında gösterilmiyor: `git log --all`'dan bir commit'in branch'i güvenilir
  alınamadığı için uydurma yerine çıkarıldı.
- Tasarımdaki "Local (Ollama/llama.cpp) · localhost:11434" **placeholder**; ürün Claude CLI/API'de.
- Özel Tauri titlebar (mac trafik ışıkları) uygulanmadı — gerçek pencere çerçevesi korunuyor.
- Sırlar hâlâ `plugin-store`'da düz; hedef OS keychain (swap noktası `services/config.ts`
  `getSecret/setSecret`).
- `tauri dev` derlemesi doğrulandı ancak GUI penceresi bu oturumda açılıp elle gezilmedi.
