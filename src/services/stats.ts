// Commit verisinden türetilen istatistikler (dashboard / streak / projeler).
// SAF fonksiyonlar — I/O yok, storage'dan gelen CommitRow[] üzerinde çalışır, birim test edilir.
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type {
  CommitListDay,
  CommitRow,
  DayActivity,
  ProjectStats,
  RangeStats,
  ReportPeriod,
  StreakStats,
} from "@/types";

/** Bir commit'in gün anahtarı (YYYY-MM-DD). */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Periyot için tarih aralığı: periyodun başından bugüne (dahil). */
export function rangeFor(period: ReportPeriod, today: string): { from: string; to: string } {
  const d = parseISO(today);
  const fmt = (x: Date) => format(x, "yyyy-MM-dd");
  switch (period) {
    case "daily":
      return { from: today, to: today };
    case "weekly":
      return { from: fmt(startOfWeek(d, { weekStartsOn: 1 })), to: today };
    case "monthly":
      return { from: fmt(startOfMonth(d)), to: today };
    case "yearly":
      return { from: fmt(startOfYear(d)), to: today };
  }
}

/** Commit'leri güne göre aktivite serisine indirger (artan sırada). */
export function computeDayActivity(commits: CommitRow[]): DayActivity[] {
  const map = new Map<string, DayActivity>();
  for (const c of commits) {
    const date = dayKey(c.committedAt);
    const cur = map.get(date) ?? { date, count: 0, additions: 0, deletions: 0 };
    cur.count += 1;
    cur.additions += c.additions;
    cur.deletions += c.deletions;
    map.set(date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Aralıktaki toplamlar (commit / +ekleme / −silme). */
export function computeRangeStats(commits: CommitRow[]): RangeStats {
  return commits.reduce<RangeStats>(
    (acc, c) => ({
      commits: acc.commits + 1,
      additions: acc.additions + c.additions,
      deletions: acc.deletions + c.deletions,
    }),
    { commits: 0, additions: 0, deletions: 0 },
  );
}

/**
 * Streak istatistikleri: aktif gün kümesinden şu anki/en uzun seri + toplam aktif gün.
 * `today` dışarıdan verilir (test edilebilirlik için).
 */
export function computeStreak(activeDates: string[], today: string): StreakStats {
  const set = new Set(activeDates);
  const total = set.size;
  if (total === 0) return { current: 0, longest: 0, totalActiveDays: 0 };

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Şu anki seri: bugünden (ya da bugün boşsa dünden) geriye doğru kesintisiz.
  let current = 0;
  const yest = format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  let cursor = set.has(today) ? today : set.has(yest) ? yest : null;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = format(addDays(parseISO(cursor), -1), "yyyy-MM-dd");
  }

  return { current, longest, totalActiveDays: total };
}

/** Proje (repo) bazlı özet — commit'ler yeni→eski geldiği varsayılır. */
export function computeProjectStats(commits: CommitRow[]): ProjectStats[] {
  const map = new Map<string, ProjectStats>();
  for (const c of commits) {
    const cur =
      map.get(c.repoName) ??
      ({
        project: c.project,
        repoName: c.repoName,
        repoPath: "",
        commits: 0,
        backend: 0,
        frontend: 0,
        additions: 0,
        deletions: 0,
        lastCommit: undefined,
      } satisfies ProjectStats);
    cur.commits += 1;
    if (c.area === "be") cur.backend += 1;
    else if (c.area === "fe") cur.frontend += 1;
    cur.additions += c.additions;
    cur.deletions += c.deletions;
    // commit'ler DESC geldiği için ilk görülen en yenisidir.
    if (!cur.lastCommit) {
      cur.lastCommit = { sha: c.sha, message: c.message, committedAt: c.committedAt };
    }
    map.set(c.repoName, cur);
  }
  return [...map.values()].sort((a, b) => b.commits - a.commits);
}

/** Commit'leri güne göre gruplar (yeni→eski) — Commitlerim ekranı. */
export function groupByDay(commits: CommitRow[]): CommitListDay[] {
  const map = new Map<string, CommitListDay>();
  for (const c of commits) {
    const date = dayKey(c.committedAt);
    const cur =
      map.get(date) ?? ({ date, items: [], commits: 0, additions: 0, deletions: 0 } satisfies CommitListDay);
    cur.items.push(c);
    cur.commits += 1;
    cur.additions += c.additions;
    cur.deletions += c.deletions;
    map.set(date, cur);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * [from..to] aralığındaki HER gün için aktivite (boş günler count=0).
 * Streak takvimi ve dashboard heatmap'i için sabit uzunlukta seri üretir.
 */
export function fillCalendar(activity: DayActivity[], from: string, to: string): DayActivity[] {
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const out: DayActivity[] = [];
  const end = parseISO(to);
  let cursor = parseISO(from);
  while (differenceInCalendarDays(end, cursor) >= 0) {
    const key = format(cursor, "yyyy-MM-dd");
    out.push(byDate.get(key) ?? { date: key, count: 0, additions: 0, deletions: 0 });
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Aktivite sayısını 0–4 yoğunluk seviyesine (heatmap rengi) çevirir. */
export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** Haftalık aktivite: Pzt→Paz commit sayıları (dashboard bar grafiği). */
export function weeklyBuckets(activity: DayActivity[]): Array<{ label: string; count: number }> {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const a of activity) {
    // getDay: 0=Paz..6=Cmt → Pazartesi-öncelikli indekse çevir.
    const js = parseISO(a.date).getDay();
    const idx = (js + 6) % 7;
    counts[idx] += a.count;
  }
  return WEEKDAY_LABELS.map((label, i) => ({ label, count: counts[i] }));
}
