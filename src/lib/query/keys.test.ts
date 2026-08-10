import { describe, expect, it } from "vitest";
import { queryKeys } from "./keys";

describe("queryKeys.commits", () => {
  // Regresyon: days (CommitListDay[]) ve range (CommitRow[]) FARKLI şekiller döndüğü için
  // aynı cache anahtarını paylaşamazlar; paylaşırlarsa CommitsPage düz satır okuyup
  // `d.items.forEach` üzerinde patlar.
  it("days ve range için ayrı cache anahtarı üretir", () => {
    const days = queryKeys.commits.days("2026-01-01", "2026-01-31");
    const range = queryKeys.commits.range("2026-01-01", "2026-01-31");
    expect(days).not.toEqual(range);
  });

  it("her ikisi de commits.all altında kalır (toplu invalidation için)", () => {
    const [root] = queryKeys.commits.all;
    expect(queryKeys.commits.days("a", "b")[0]).toBe(root);
    expect(queryKeys.commits.range("a", "b")[0]).toBe(root);
  });
});
