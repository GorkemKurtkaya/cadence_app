import { describe, expect, it } from "vitest";
import {
  activityLevel,
  computeProjectStats,
  computeRangeStats,
  computeStreak,
  fillCalendar,
  groupByDay,
  rangeFor,
  weeklyBuckets,
} from "./stats";
import type { CommitRow } from "@/types";

function commit(partial: Partial<CommitRow>): CommitRow {
  return {
    sha: "abc1234",
    committedAt: "2026-07-24T10:00:00Z",
    author: "me",
    message: "iş",
    body: "",
    filesChanged: 1,
    additions: 10,
    deletions: 2,
    source: "local",
    repoName: "novelify",
    project: "Novelify",
    area: "be",
    paths: ["api/x.py"],
    ...partial,
  };
}

describe("computeStreak", () => {
  it("bugüne kadar kesintisiz seriyi sayar", () => {
    const s = computeStreak(["2026-07-22", "2026-07-23", "2026-07-24"], "2026-07-24");
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.totalActiveDays).toBe(3);
  });

  it("bugün boşsa dünden geriye sayar", () => {
    const s = computeStreak(["2026-07-22", "2026-07-23"], "2026-07-24");
    expect(s.current).toBe(2);
  });

  it("boşlukta şu anki seri sıfırlanır ama en uzun korunur", () => {
    const s = computeStreak(["2026-07-01", "2026-07-02", "2026-07-24"], "2026-07-24");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it("aktivite yoksa sıfır döner", () => {
    expect(computeStreak([], "2026-07-24")).toEqual({ current: 0, longest: 0, totalActiveDays: 0 });
  });
});

describe("computeProjectStats", () => {
  it("repoya göre gruplar, be/fe ayırır, en yeni commit'i tutar", () => {
    const commits = [
      commit({ sha: "n1", repoName: "novelify", area: "fe", committedAt: "2026-07-24T12:00:00Z" }),
      commit({ sha: "n2", repoName: "novelify", area: "be", committedAt: "2026-07-24T09:00:00Z" }),
      commit({ sha: "f1", repoName: "fastdrama", area: "be", committedAt: "2026-07-24T08:00:00Z" }),
    ];
    const stats = computeProjectStats(commits);
    expect(stats[0].repoName).toBe("novelify");
    expect(stats[0].commits).toBe(2);
    expect(stats[0].frontend).toBe(1);
    expect(stats[0].backend).toBe(1);
    expect(stats[0].lastCommit?.sha).toBe("n1");
  });
});

describe("groupByDay", () => {
  it("commit'leri güne göre yeni→eski gruplar", () => {
    const commits = [
      commit({ committedAt: "2026-07-24T10:00:00Z" }),
      commit({ committedAt: "2026-07-23T10:00:00Z" }),
      commit({ committedAt: "2026-07-24T08:00:00Z" }),
    ];
    const days = groupByDay(commits);
    expect(days.map((d) => d.date)).toEqual(["2026-07-24", "2026-07-23"]);
    expect(days[0].commits).toBe(2);
  });
});

describe("computeRangeStats", () => {
  it("toplamları hesaplar", () => {
    const s = computeRangeStats([commit({ additions: 5, deletions: 1 }), commit({ additions: 3, deletions: 2 })]);
    expect(s).toEqual({ commits: 2, additions: 8, deletions: 3 });
  });
});

describe("rangeFor", () => {
  it("günlük tek gün döner", () => {
    expect(rangeFor("daily", "2026-07-24")).toEqual({ from: "2026-07-24", to: "2026-07-24" });
  });
  it("haftalık pazartesiden bugüne", () => {
    // 2026-07-24 Cuma → hafta başı Pzt 2026-07-20
    expect(rangeFor("weekly", "2026-07-24")).toEqual({ from: "2026-07-20", to: "2026-07-24" });
  });
});

describe("fillCalendar", () => {
  it("aralıktaki her günü doldurur, boşları 0 yapar", () => {
    const cal = fillCalendar([{ date: "2026-07-23", count: 2, additions: 0, deletions: 0 }], "2026-07-22", "2026-07-24");
    expect(cal).toHaveLength(3);
    expect(cal[0].count).toBe(0);
    expect(cal[1].count).toBe(2);
  });
});

describe("activityLevel", () => {
  it("sayıyı 0-4 seviyesine çevirir", () => {
    expect(activityLevel(0)).toBe(0);
    expect(activityLevel(1)).toBe(1);
    expect(activityLevel(3)).toBe(2);
    expect(activityLevel(10)).toBe(4);
  });
});

describe("weeklyBuckets", () => {
  it("pazartesi-öncelikli 7 kova döner", () => {
    // 2026-07-24 Cuma → indeks 4
    const b = weeklyBuckets([{ date: "2026-07-24", count: 3, additions: 0, deletions: 0 }]);
    expect(b).toHaveLength(7);
    expect(b[4]).toEqual({ label: "Cum", count: 3 });
  });
});
