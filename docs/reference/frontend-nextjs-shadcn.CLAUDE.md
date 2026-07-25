# Next.js + shadcn/ui Project Rules

Bu proje Next.js 16 (App Router) ve shadcn/ui kullanmaktadir.

---

## Commands

```bash
npm install               # Bagimliliklari kur
npm run dev               # Dev server (port 5744 — DEFAULT 3000 DEGIL!)
npm run build             # Production build
npm run start             # Production server (port 5744)
npm run lint              # ESLint
```

**Port override:** `PORT=3000 npm run dev` (cross-env ile)
**Type check:** Script yok ama `npx tsc --noEmit` ile manuel calistirilabilir
**Test:** Test framework kurulu degil (proje testsiz)

---

## Setup

1. `npm install`
2. `.env` dosyasini olustur (proje root'unda)
3. Gerekli env degiskenleri:
   ```
   PORT=5744
   NEXT_PUBLIC_API_URL=...
   NEXT_PUBLIC_API_BASE_URL=...
   NEXT_PUBLIC_SOCKET_URL=...
   NEXT_PUBLIC_SENTRY_DSN=...
   NEXT_PUBLIC_DEFAULT_THEME=...
   ```
4. `npm run dev` → `http://localhost:5744`

Tam env listesi icin `.env` dosyasina bak (20+ degisken var, Sentry/feature flag'ler dahil).

---

## Teknoloji Stack

- **Framework:** Next.js 16.x (App Router, RSC) + React 19
- **Language:** TypeScript 5.8 (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Library:** shadcn/ui (new-york style) + Radix UI
- **State Management:** Zustand (client state), TanStack Query (server state)
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React + Remixicon
- **Animation:** Motion (framer-motion)
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Editor:** Plate.js + TipTap
- **Date:** date-fns + react-day-picker
- **DnD:** @dnd-kit + @hello-pangea/dnd
- **Realtime:** socket.io-client
- **Notifications:** sonner (toast)

---

## Proje Yapisi

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Protected routes (dashboard, ai, gifts, stories, vault, ...)
│   ├── (guest)/                  # Login, forgot-password, pages
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── globals.css
│   └── themes.css
│
├── components/
│   ├── ui/                       # shadcn/ui base (DO NOT MODIFY)
│   ├── common/                   # Shared components (page-header, data-table, vs.)
│   ├── guards/                   # Auth/permission guards
│   ├── layout/                   # Layout components (sidebar, header, footer)
│   ├── theme-customizer/         # Theme customization UI
│   ├── active-theme.tsx
│   ├── icon.tsx
│   ├── date-time-picker.tsx
│   ├── custom-date-range-picker.tsx
│   └── CardActionMenus.tsx
│
├── lib/
│   ├── utils.ts                  # cn() ve helperlar
│   ├── api/                      # Merkezi API katmani
│   │   ├── client.ts             # Base API client (fetch wrapper)
│   │   ├── endpoints.ts          # API endpoint tanimlari
│   │   └── helpers.ts
│   ├── query/                    # TanStack Query setup
│   │   ├── client.ts
│   │   ├── keys.ts
│   │   └── provider.tsx
│   ├── i18n/                     # Internationalization
│   │   ├── index.ts
│   │   ├── locales/
│   │   └── provider.tsx
│   ├── validations/              # Zod schemas
│   ├── themes.ts
│   ├── fonts.ts
│   ├── ga.ts                     # Google Analytics
│   ├── vtt-parser.ts
│   └── compose-refs.ts
│
├── hooks/
│   ├── queries/                  # TanStack Query hooks
│   ├── use-copy-to-clipboard.ts
│   ├── use-debounce.ts
│   ├── use-file-upload.ts
│   ├── use-mobile.ts
│   ├── use-permissions.ts
│   ├── use-table-sort.ts
│   └── use-toast.ts
│
├── stores/                       # Zustand stores
│   ├── use-auth-store.ts
│   ├── use-process-store.ts
│   ├── use-title-gen-results-store.ts
│   └── use-video-upload-store.ts
│
├── services/                     # Business logic & API calls
│   ├── auth.service.ts
│   ├── file.service.ts
│   ├── popkon.service.ts
│   ├── tools.service.ts
│   └── video.service.ts
│
├── types/                        # TS type tanimlari
├── config/                       # App config (site.ts)
└── public/                       # Static assets
```

**Not:** Yeni feature klasoru olustururken `app/(auth)/<feature>/` altina koy. Ornek mevcut feature'lar: `ai`, `gifts`, `stories`, `vault`, `dashboard`, `analytics`, `notes`, vs.

---

## Kod Yazim Kurallari

### 1. Component Yapisi

- `"use client"` sadece client-side logic gerektiginde
- Props icin TypeScript interface
- `className` prop'u + `cn()` ile customization
- **Named export** (default export degil)
- Files: kebab-case, Components: PascalCase

```tsx
interface ExampleComponentProps {
  title: string;
  className?: string;
}

export function ExampleComponent({ title, className }: ExampleComponentProps) {
  return <div className={cn("flex flex-col gap-4", className)}>...</div>;
}
```

### 2. Naming Conventions

- **Files:** kebab-case (`user-profile.tsx`, `use-auth.ts`)
- **Components:** PascalCase (`UserProfile`)
- **Hooks:** camelCase + `use` prefix (`useAuth`)
- **Stores:** `use<Feature>Store` (`useAuthStore`)
- **Types/Interfaces:** PascalCase (`User`)
- **Constants:** SCREAMING_SNAKE_CASE (`API_BASE_URL`)

### 3. Import Sirasi

```tsx
// 1. React/Next.js
// 2. External libraries
// 3. Internal UI components (@/components/ui)
// 4. Internal custom components (@/components/common, vs.)
// 5. Hooks, stores, lib utils
// 6. Types (import type)
// 7. Styles
```

### 4. shadcn/ui Kullanimi

- `components/ui/` **MODIFIYE ETME** — wrapper component olustur
- `variant`, `size` gibi prop'larla kullan (`<Button variant="outline" size="sm" />`)
- `cn()` ile class birlestir

### 5. Form Yapisi

- React Hook Form + Zod (`@hookform/resolvers/zod`)
- Schema → `lib/validations/<feature>.ts`
- `Form` componentleri shadcn/ui'den (`@/components/ui/form`)
- Error mesajlari `<FormMessage />` ile (manuel ekleme yok)

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

### 6. Merkezi API Servisi

**TUM API ISTEKLERI** [`lib/api/client.ts`](lib/api/client.ts) uzerinden yapilir.

- Direkt `fetch()` **YASAK**
- Endpoint'ler [`lib/api/endpoints.ts`](lib/api/endpoints.ts)'de tanimli (`API_ENDPOINTS.USERS.LIST` gibi)
- `api.get/post/put/patch/delete<T>(endpoint, data?)` ile kullan
- Auth token otomatik eklenir, 401'de auto-logout
- Hata `ApiException` olarak firlatilir
- Service katmani: `services/<feature>.service.ts` — `API_ENDPOINTS` + `api` kullanir

### 7. TanStack Query Kurulumu

**TUM SERVER STATE** TanStack Query ile. Setup [`lib/query/`](lib/query/)'de.

- Query client config: `staleTime: 5min`, `gcTime: 30min`, `retry: 1`, `refetchOnWindowFocus: false`
- Query keys factory pattern: [`lib/query/keys.ts`](lib/query/keys.ts)
  - `queryKeys.<feature>.lists()`, `queryKeys.<feature>.detail(id)`, vs.
  - String olarak yazma — **HER ZAMAN factory kullan**
- Hooks: `hooks/queries/use-<feature>.ts`
- Mutation'larda `onSuccess` → ilgili `queryKeys`'leri invalidate et

### 8. Component'te TanStack Query Kullanimi

```tsx
const { data, isLoading, isError, error } = useUsers();

if (isLoading) return <UsersSkeleton />;
if (isError) return <ErrorAlert message={error?.message} />;
if (!data?.length) return <EmptyState />;

return <UsersList users={data} />;
```

**Loading icin spinner DEGIL, skeleton kullan** (Section 9).

### 9. Skeleton Pattern

**HER COMPONENT ICIN ESLESIK SKELETON.** Component dosyasinin yaninda export et:

```tsx
export function UserCard({ user }: Props) { ... }
export function UserCardSkeleton() { ... }   // Ayni yapi, icerik <Skeleton />
```

### 10. Zustand Store (Sadece Client State)

Zustand **SADECE client-side state** icin. Server state icin TanStack Query.

```tsx
// stores/use-auth-store.ts
export const useAuthStore = create<AuthState>()(
  persist((set) => ({ ... }), { name: "auth-storage" })
);
```

---

## Page Yapisi (App Router)

- **Server Component default** — async kullanilabilir, server-side data fetching
- `"use client"` sadece interaktif componentlerde
- Metadata export et (`export const metadata: Metadata = { ... }`)
- Loading state: `loading.tsx` (route-level)
- Error boundary: `error.tsx` (route-level, **"use client" gerekli**)

```tsx
// app/(auth)/dashboard/page.tsx
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await fetchData();
  return <DashboardContent initialData={data} />;
}
```

---

## Tailwind CSS Kurallari

### Class Sirasi

Layout → Spacing → Sizing → Typography → Visual → States → Responsive

### Responsive

- **Mobile-first** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Container: `container mx-auto px-4 md:px-6 lg:px-8`
- `prettier-plugin-tailwindcss` ve `eslint-plugin-better-tailwindcss` aktif → otomatik siralanir

---

## i18n / Toast Kurali (KRITIK)

**Sistem 4-5 dil destekleyecek. Static string YASAK.**

Toast mesajlarinda ve UI metinlerinde:
- API'den donen `message.key` degerini dogrudan kullan
- Toast rengi `response.success` degerine gore

```tsx
// YANLIS
toast.success("Cikis yapildi", { description: response.message.key });
toast.error("Hata olustu");

// DOGRU
if (response.success) {
  toast.success(response.message.key);
} else {
  toast.error(response.message.key);
}
```

---

## Best Practices Checklist

### Component
- [ ] `"use client"` sadece gerektiginde
- [ ] Props icin interface
- [ ] `className` + `cn()`
- [ ] Named export

### Performance
- [ ] Server Components default
- [ ] `next/image` kullan
- [ ] Dynamic import (buyuk componentler)
- [ ] `useMemo`/`useCallback` sadece gerektiginde

### Accessibility
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Color contrast

### Code Quality
- [ ] TypeScript strict mode (zaten acik)
- [ ] ESLint kurallarina uy
- [ ] Prettier ile formatla
- [ ] DRY

---

## Yapilmamasi Gerekenler

1. **`components/ui/` modifiye etme** — wrapper olustur
2. **`any` type kullanma** — dogru type tanimla
3. **`console.log` birakma** — production'da kaldir
4. **Inline style kullanma** — Tailwind class
5. **`index.ts`'e her seyi export etme** — gereksiz bundle size
6. **`useEffect` icinde async function** — cleanup pattern kullan
7. **Props drilling** — Zustand veya Context
8. **Hardcoded string** — `message.key` ve i18n kurali (yukarida)
9. **Direkt `fetch()`** — `api` client zorunlu
10. **Server state icin `useState`** — TanStack Query
11. **Loading icin spinner** — skeleton pattern
12. **API endpoint hardcode** — `API_ENDPOINTS` sabiti
13. **Query key string** — `queryKeys` factory

---

## Ornek Feature Klasor Yapisi

```
app/(auth)/<feature>/
├── page.tsx                      # List page
├── loading.tsx
├── error.tsx
├── [id]/
│   └── page.tsx                  # Detail page
└── components/
    ├── <feature>-table.tsx
    ├── <feature>-card.tsx
    ├── <feature>-form.tsx
    └── <feature>-filters.tsx
```

Mevcut feature ornekleri: `app/(auth)/gifts/`, `app/(auth)/ai/models/`, `app/(auth)/stories/`.

---

## Claude Code Plugin Kullanimi

Bu projede 3 ana plugin var. **Ihtiyac halinde** tetiklenir, surekli degil.
Kucuk islerde plugin akisina girmek vakit kaybi — direkt is.

### 1. `superpowers` — Workflow & Metodoloji

14 skill. Hepsini her zaman degil, ise gore secimli kullanilir.

| Skill | Kullan | ATLA |
|-------|--------|------|
| `superpowers:brainstorming` | Yeni feature, refactor, UI tasarim (kafa karistiran her sey) | Tek button text/icon, renk/spacing tweak, bug fix |
| `superpowers:writing-plans` | 3+ adimli is, birden cok dosya etkilenecek | Tek dosya / tek edit |
| `superpowers:executing-plans` | Hazirlanmis plan dosyasi varsa | Plansiz ufak isler |
| `superpowers:subagent-driven-development` | Bagimsiz task'lar paralel kosabilirse | Sequential isler |
| `superpowers:systematic-debugging` | Bug, test failure, "niye boyle oluyor" | Bilinen syntax / typo |
| `superpowers:verification-before-completion` | Major feature bitince, "calisiyor mu" kanitla | Tek satir typo fix |
| `superpowers:using-git-worktrees` | Izole feature workspace gerek | Mevcut branch'te ufak is |
| `superpowers:requesting-code-review` | Major PR oncesi | Trivial commit |
| `superpowers:test-driven-development` | Test yazilirken | (proje su an testsiz) |

### 2. `frontend-design` — Production-Grade UI

**Sadece** yeni UI tasarliyorsan veya buyuk redesign yapiyorsan. Otomatik tetiklenir, ama "varolan card'a hover effect ekle" gibi ufak islerde gereksiz — direkt yaz.

Ne yapar:
- Bold typography (Inter / Roboto'dan kacinma)
- Cohesive color palette (CSS variables)
- Motion library ile animation
- Spatial composition (asimetri, grid-breaking)

- **ATLA:** Button text degisikligi, renk tweak, mevcut komponent reuse, bug fix
- **KULLAN:** Yeni sayfa, dialog, major redesign, "tasarim onerisi ister misin" anlari

### 3. `ui-ux-pro-max` — Tasarim Referans Kutuphanesi

**Sadece** visual companion'da varyant uretirken cagrilir. 161 renk paleti, 57 font pairing, 50+ stil, 25 chart turu (Recharts uyumlu), 99 UX guideline.

Bu proje **admin panel / dashboard** kategorisi.

- **ATLA:** Plain implementation (varyant uretmeyecegim), stil zaten belli
- **KULLAN:** Brainstorming'de "ne tip layout?" sorusu cikti, varyantlari beslemek lazim

### Plugin Tetikleme Akisi (Karar Agaci)

**Cogu kucuk is:** Plugin cagirmadan direkt yap.

**Yeni UI / buyuk redesign:**
```
1. brainstorming (intent + requirements)
2. Kullaniciya: "visual companion acalim mi?" diye sor (Frontend Tasarim Workflow)
   → EVET: ui-ux-pro-max'tan ref cek → 2-3 HTML varyant → kullanici secim
   → HAYIR: terminal brainstorm
3. frontend-design ile production code
4. (Major isse) verification-before-completion
```

**Bug / "niye boyle oluyor":**
```
systematic-debugging → fix → (major isse) verification → done
```

**Multi-step refactor / yeni feature:**
```
brainstorming → writing-plans → executing-plans → (major isse) verification
```

**Kutuphane sorusu (Next.js 16, Tailwind v4, shadcn, vs.):**
- Bilgim yetersizse `context7` (kurulu) otomatik bakar.

### Genel Kural

Plugin'i cagirmadan once kendine sor: **"Bu is plugin'siz 5 dakikada biter mi?"**
Cevap evetse → plugin atla, direkt yap. Hayirsa → ilgili plugin'i cagir.

---

## Frontend Tasarim Workflow (Brainstorming + Visual Companion)

UI/component/sayfa tasarlanacaksa veya bir UI'in **gorsel** yapisi degisecekse:

1. **MUTLAKA** once `superpowers:brainstorming` skill'ini cagir
2. Brainstorming icinde, plan modunda **kullaniciya sor**:
   > "Bu is icin visual companion (browser'da varyant secimi) acalim mi, yoksa direkt terminalde mi devam edelim?"
3. Kullanici "ac" derse:
   - `scripts/start-server.sh --project-dir <bu-proje>` ile localhost server baslat
   - 2-3 varyanti `.superpowers/brainstorm/<id>/content/` altina HTML olarak yaz
   - Her varyantin kisa aciklamasi olmali (A: ..., B: ..., C: ...)
   - Varyantlar shadcn/ui + Tailwind kullanmali (proje stack'iyle uyumlu)
   - Kullanici secimi yapana kadar **kod yazma**
4. Kullanici "gerek yok" derse → direkt terminalde brainstorm + implementasyon

### Visual companion ONERILECEK durumlar (sormaya deger):
- Yeni sayfa / dialog / form layout'u
- Buyuk UI redesign
- Birden fazla layout secenegi olabilecek isler (sidebar konumu, kart yapisi, tab vs accordion, vs.)

### Visual companion ONERILMEYEN durumlar (sormadan terminalde devam et):
- Bug fix
- Tek bir button / icon / text degisikligi
- Renk / spacing / font ufak ayarlar
- Salt data / state / logic degisikligi
- Mevcut tasarim pattern'ini baska bir yerde aynen tekrarlamak

### Notlar:
- `.superpowers/` klasoru `.gitignore`'da (eklendi)
- Server otomatik 30dk idle sonrasi kapanir
