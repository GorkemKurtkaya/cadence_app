# CLAUDE.md

Bu dosya, bu depoda çalışırken Claude Code'a (claude.ai/code) rehberlik eder.

> İki referans kural dosyası `docs/reference/` altında arşivlendi
> (`backend-express-mongo.CLAUDE.md`, `frontend-nextjs-shadcn.CLAUDE.md`). Bu dosya, o ikisinin
> `rapor_app`'e uyarlanmış **hibrit** halidir.

---

## Proje Özeti

`rapor_app`, **Mac + Windows** üzerinde çalışan bir **masaüstü geliştirici rapor uygulamasıdır**.

Ne yapar:
- Yereldeki **git repolarını** ve (opsiyonel) **GitHub hesabını** tarayıp geçmiş commit'leri toplar.
- Günün commit + diff özetlerini **Claude'a** yollayıp **3 bölümlü günlük rapor** üretir:
  📝 Özet/Günlük · 👔 Standup · 🔧 Teknik Günlük.
- Geçmiş günlerin verisini **yerelde SQLite**'ta saklar.

Sunucu YOKTUR. Tüm iş mantığı uygulamanın içindeki TypeScript **servis katmanında** çalışır; sistem
erişimi (git/CLI/dosya/DB) Tauri plugin'leri üzerinden yapılır.

---

## Komutlar

```bash
npm install               # Bağımlılıkları kur
npm run tauri dev         # Geliştirme (Tauri pencere + Vite dev server)
npm run tauri build       # Production paket (Mac .dmg / Windows .msi-.exe)
npm run dev               # Yalnız web katmanı (Vite, tarayıcıda; Tauri API'leri çalışmaz)
npm run lint              # ESLint
npx tsc --noEmit          # Tip kontrolü (ayrı script yok, manuel)
npm run test              # Vitest (kritik saf fonksiyonlar için)
```

İlk kez kurulumda Rust toolchain gerekir (`rustup`) — yalnızca derleme için, kod hep TS'te.

---

## Teknoloji Stack

- **Kabuk:** Tauri v2
  - `@tauri-apps/plugin-shell` — `git` ve `claude` CLI çağrısı (izinli komutlar `capabilities`'te)
  - `@tauri-apps/plugin-sql` — SQLite (geçmiş verisi)
  - `@tauri-apps/plugin-fs` — repo klasörlerini taramak
  - `@tauri-apps/plugin-store` — ayarlar; sırlar OS keychain'de
- **Framework:** Vite + React 19
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Library:** shadcn/ui (new-york) + Radix
- **State:** Zustand (client state) · TanStack Query (async/"server" state)
- **Forms:** React Hook Form + Zod
- **Router:** @tanstack/react-router
- **Icons:** Lucide React
- **Charts:** Recharts (ileride: haftalık/aylık commit grafikleri)
- **Claude:** yerel `claude` CLI (varsayılan) · `@anthropic-ai/sdk` (API modu)
- **GitHub:** `gh` CLI (varsa) · fallback Octokit + token

---

## Proje Yapısı

```
/
├── src/
│   ├── main.tsx / App.tsx
│   ├── router.tsx                 # @tanstack/react-router
│   ├── features/                  # Ekran/feature bazlı
│   │   ├── today/                 # Bugün: tarama + "Rapor Üret" + sonuç
│   │   ├── history/               # Geçmiş: takvim/liste → gün detayı
│   │   ├── report/                # Rapor detayı (3 bölüm markdown)
│   │   └── settings/              # Repo kökleri, Claude modu/model, GitHub token
│   │       └── components/  <feature>-form.tsx, <feature>-*.tsx, *-skeleton
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base — DEĞİŞTİRME, wrapper yaz
│   │   ├── common/                # page-header, data-table, empty-state, error-alert...
│   │   └── layout/                # sidebar, header
│   ├── services/                  # TÜM iş mantığı & sistem erişimi (aşağıya bak)
│   │   ├── config.ts              # Merkezi ayar erişimi — TEK kaynak
│   │   ├── logger.ts              # Yapısal logger — console.log YASAK
│   │   ├── storage.ts             # SQLite şema + CRUD
│   │   ├── repoScanner.ts         # git log tarama
│   │   ├── githubConnector.ts     # gh/Octokit
│   │   ├── claudeRunner.ts        # CLI + API modu
│   │   └── reportGenerator.ts     # prompt builder + 3-bölüm parser
│   ├── hooks/
│   │   └── queries/               # TanStack Query hook'ları: use-<feature>.ts
│   ├── stores/                    # Zustand: use-<feature>-store.ts
│   ├── lib/
│   │   ├── utils.ts               # cn() ve helper'lar
│   │   ├── query/                 # client.ts, keys.ts, provider.tsx
│   │   ├── validations/           # Zod şemaları
│   │   └── i18n/                  # (MVP: TR default; çok dil için hazır iskele)
│   └── types/
├── src-tauri/                     # Tauri kabuğu: capabilities, plugin config, (gerekirse) commands
├── docs/reference/                # Arşiv: eski backend/frontend CLAUDE.md'leri
└── public/
```

Yeni ekran: `src/features/<feature>/` altına koy — `components/`, skeleton'lar, gerekirse form.

---

## Kritik Kural: Servis Katmanı (backend'den uyarlandı)

**Sistem erişimi (git, `claude`, dosya, SQLite) ve iş mantığı YALNIZCA `src/services/` içinde.**

- UI/component içinde doğrudan `Command`/`invoke`/git/CLI çağrısı **YASAK** → servis fonksiyonu çağır.
- Ayar/env erişimi **tek kaynaktan**: `services/config.ts`. Başka yerde dağınık okuma yok.
  (Backend'deki "process.env sadece config.js'te" kuralının masaüstü karşılığı.)
- Loglama **yapısal logger** ile: `services/logger.ts`, modül bazlı. `console.log` **YASAK**.
- Her servis tek sorumluluk taşır, bağımsız test edilebilir; saf fonksiyonlar (prompt builder,
  parser) I/O'dan ayrı tutulur ve birim test edilir.
- Sırlar (GitHub token, Anthropic API key) OS keychain'de; asla düz metin/log/commit'e girmez.

---

## Kod Yazım Kuralları (frontend'den korunan)

### Component
- Props için TypeScript interface; `className` prop'u + `cn()` ile customization.
- **Named export** (default export değil).
- Files: **kebab-case** · Components: **PascalCase** · Hooks: `use` + camelCase ·
  Stores: `use<Feature>Store` · Types: PascalCase · Constants: SCREAMING_SNAKE_CASE.

### shadcn/ui
- `components/ui/` **MODİFİYE ETME** — wrapper component oluştur.
- `variant`/`size` prop'larıyla kullan; `cn()` ile class birleştir.

### Form
- React Hook Form + Zod (`@hookform/resolvers/zod`); şema → `lib/validations/<feature>.ts`.
- Error mesajları `<FormMessage />` ile.

### TanStack Query (async state — git tarama, rapor üretme, github çekme, geçmiş okuma)
- **TÜM async iş** TanStack Query ile. Servis fonksiyonlarını hook'lardan çağır (`hooks/queries/`).
- Query keys **factory pattern**: `lib/query/keys.ts` (`queryKeys.reports.detail(date)` gibi).
  String key yazma — her zaman factory.
- Mutation `onSuccess` → ilgili key'leri invalidate et.
- Loading için **spinner değil, skeleton**.

### Skeleton Pattern
- **Her component için eşleşik skeleton**, aynı dosyada export:
  ```tsx
  export function ReportCard({ report }: Props) { ... }
  export function ReportCardSkeleton() { ... }   // aynı yapı, içerik <Skeleton />
  ```

### Zustand
- **Yalnız client-side state** (seçili tarih, UI tercihleri). Async/veri state'i TanStack Query'de.

### Import Sırası
1. React · 2. External · 3. `@/components/ui` · 4. custom components · 5. hooks/stores/lib/services
· 6. `import type` · 7. styles.

---

## Kod Stili

- **Türkçe** yorum ve kullanıcı mesajları (proje Türkçe).
- Tüm import'lar dosya başında.
- `async/await` (Promise.then değil).
- Tutarlı `try/catch` hata yönetimi; hatalar servis katmanında yakalanıp anlamlı tiplerle döner.

---

## Yapılmayacaklar

1. `components/ui/` modifiye etme → wrapper oluştur.
2. `any` type → doğru type tanımla.
3. `console.log` bırakma → `services/logger.ts`.
4. Inline style → Tailwind class.
5. UI'da doğrudan git/CLI/dosya/`invoke` çağrısı → `src/services/`.
6. Dağınık env/config okuma → `services/config.ts`.
7. Server/async state için `useState` → TanStack Query.
8. Loading için spinner → skeleton pattern.
9. Query key string → `queryKeys` factory.
10. Props drilling → Zustand veya Context.
11. Sırrı (token/key) log'a, commit'e, düz store'a yazma → keychain.
12. `useEffect` içinde temizliksiz async → cleanup pattern.

---

## i18n

- MVP'de **Türkçe varsayılan**. String'ler `src/lib/i18n/` altında toplanır (ileride 4-5 dil için
  hazır iskele). Frontend projesindeki sıkı `message.key` zorunluluğu burada gevşetilir — yerel
  HTTP API yok, mesajlar uygulama içinde üretilir.

---

## Claude Code Plugin Kullanımı

Bu projede plugin'ler **ihtiyaç halinde** tetiklenir, sürekli değil. Küçük işlerde plugin akışına
girmek vakit kaybı — direkt iş. **Proje kategorisi: masaüstü dashboard.**

### Karar: "Bu iş plugin'siz 5 dakikada biter mi?" → Evet ise plugin atla.

| Durum | Akış |
|-------|------|
| Yeni feature / UI / büyük redesign | `superpowers:brainstorming` → (gerekirse visual companion) → `frontend-design` → kod → (major ise) `verification-before-completion` |
| Bug / "niye böyle oluyor" | `superpowers:systematic-debugging` → fix → (major ise) verification |
| Çok adımlı refactor / feature | `brainstorming` → `writing-plans` → `executing-plans` → verification |
| Kütüphane sorusu (Tauri, Tailwind v4, shadcn, TanStack) | `context7` (kurulu) otomatik bakar |

- **`frontend-design`:** yeni sayfa/dialog/major redesign'da KULLAN; buton/renk/spacing tweak'te ATLA.
- **`ui-ux-pro-max`:** yalnız visual companion'da varyant üretirken. Kategori: **masaüstü dashboard**.
- **Test:** Kritik saf fonksiyonlar (prompt builder, git-log parser, storage) için Vitest;
  UI için TDD zorunlu değil.

### Frontend Tasarım Workflow (Brainstorming + Visual Companion)
UI/görsel iş için önce `superpowers:brainstorming`; plan modunda kullanıcıya "visual companion
açalım mı?" diye sor. Açılırsa 2-3 HTML varyantı shadcn/ui + Tailwind ile hazırla, seçim yapılana
kadar kod yazma. Bug fix / tek buton / renk-spacing ayarı / salt logic değişiminde sormadan devam et.
