# Cadence — Günlük Geliştirici Raporu

Mac + Windows masaüstü uygulaması. Yereldeki git repolarını (ve opsiyonel GitHub'ı) tarar, günün
commit'lerini **Claude'a** yollayıp **3 bölümlü günlük rapor** üretir (📝 Özet · 👔 Standup · 🔧 Teknik)
ve geçmişi yerelde **SQLite**'ta saklar.

> Mimari, kurallar ve klasör yapısı için **[CLAUDE.md](./CLAUDE.md)**'ye bak.

## Teknoloji

Tauri v2 · Vite + React 19 + TypeScript · Tailwind v4 + shadcn/ui · TanStack Query · Zustand ·
React Hook Form + Zod · TanStack Router · SQLite (plugin-sql).

## Kurulum

```bash
# 1) Rust toolchain (yalnız bir kez — Tauri'nin derlemesi için gerekli)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2) Node bağımlılıkları
npm install

# 3) Geliştirme (masaüstü penceresi açılır)
npm run tauri dev
```

macOS'ta ayrıca Xcode Command Line Tools gerekir: `xcode-select --install`.
Windows'ta: Microsoft C++ Build Tools + WebView2 (genelde kuruludur).

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run tauri dev` | Masaüstü uygulaması (geliştirme) |
| `npm run tauri build` | Production paket (macOS `.dmg` / Windows `.msi`/`.exe`) |
| `npm run dev` | Yalnız web katmanı (tarayıcı — Tauri API'leri çalışmaz) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (saf fonksiyon birim testleri) |
| `npm run lint` | ESLint |

## İlk Kullanım

1. Uygulamayı aç → **Ayarlar**.
2. **Repo kök klasörleri**ne repolarının bulunduğu dizin(ler)i ekle (örn. `~/Documents/GitHub`).
3. **Claude modu**: varsayılan `claude` CLI (kuruluysa hazır) veya API anahtarı (Sırlar bölümü).
4. **Bugün** sekmesinde **Rapor Üret** → günün commit'lerinden 3 bölümlü rapor.
5. **Geçmiş** sekmesinde önceki günlerin raporlarına bak.

## Durum

Web/servis katmanı tamam ve doğrulandı (`tsc` temiz, `vitest` 12/12, `vite build` başarılı).
Masaüstü penceresini açmak (`tauri dev/build`) için yukarıdaki Rust adımı gerekli.
