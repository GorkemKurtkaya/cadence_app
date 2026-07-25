import { describe, it, expect } from "vitest";
import { parseGitLog, summarizeFiles } from "./parseGitLog";

const US = "\x1f";
const RS = "\x1e";
const GS = "\x1d";

function commitRecord(
  sha: string,
  date: string,
  author: string,
  subject: string,
  numstat: string[],
  body = "",
): string {
  const meta = `${RS}CMT${US}${sha}${US}${date}${US}${author}${US}${subject}${US}${body}${GS}`;
  return [meta, ...numstat].join("\n");
}

describe("parseGitLog", () => {
  it("boş girdide boş dizi döner", () => {
    expect(parseGitLog("")).toEqual([]);
    expect(parseGitLog("   \n ")).toEqual([]);
  });

  it("tek commit'i alanlarıyla ayrıştırır", () => {
    const raw = commitRecord("abc123", "2026-07-24T14:30:00+03:00", "Görkem", "feat: rapor ekle", [
      "12\t3\tsrc/a.ts",
      "5\t0\tsrc/b.ts",
    ]);
    const [c] = parseGitLog(raw);
    expect(c.sha).toBe("abc123");
    expect(c.committedAt).toBe("2026-07-24T14:30:00+03:00");
    expect(c.author).toBe("Görkem");
    expect(c.message).toBe("feat: rapor ekle");
    expect(c.filesChanged).toBe(2);
    expect(c.additions).toBe(17);
    expect(c.deletions).toBe(3);
    expect(c.files[0]).toEqual({ file: "src/a.ts", additions: 12, deletions: 3 });
  });

  it("çok satırlı commit açıklamasını (body) ayrıştırır", () => {
    const raw = commitRecord(
      "b7",
      "2026-07-24T10:00:00Z",
      "Görkem",
      "feat: ödeme",
      ["3\t1\tsrc/pay.ts"],
      "Stripe cent/dolar hatası düzeltildi.\nURL eksikleri giderildi.",
    );
    const [c] = parseGitLog(raw);
    expect(c.message).toBe("feat: ödeme");
    expect(c.body).toContain("Stripe cent/dolar");
    expect(c.body).toContain("URL eksikleri");
    expect(c.filesChanged).toBe(1);
    expect(c.additions).toBe(3);
  });

  it("binary dosyalarda (- -) 0 sayar", () => {
    const raw = commitRecord("d1", "2026-07-24T10:00:00Z", "X", "chore: görsel", ["-\t-\tlogo.png"]);
    const [c] = parseGitLog(raw);
    expect(c.additions).toBe(0);
    expect(c.deletions).toBe(0);
    expect(c.filesChanged).toBe(1);
  });

  it("birden çok commit'i ayırır", () => {
    const raw =
      commitRecord("s1", "2026-07-24T09:00:00Z", "A", "ilk", ["1\t1\tx"]) +
      "\n" +
      commitRecord("s2", "2026-07-24T11:00:00Z", "A", "ikinci", ["2\t0\ty"]);
    const commits = parseGitLog(raw);
    expect(commits.map((c) => c.sha)).toEqual(["s1", "s2"]);
  });

  it("dosyasız (merge/boş) commit'i tolere eder", () => {
    const raw = commitRecord("m1", "2026-07-24T09:00:00Z", "A", "merge", []);
    const [c] = parseGitLog(raw);
    expect(c.filesChanged).toBe(0);
    expect(c.additions).toBe(0);
  });
});

describe("summarizeFiles", () => {
  it("boş listede uygun metin döner", () => {
    expect(summarizeFiles([])).toContain("yok");
  });

  it("çok dosyada kırpma yapar", () => {
    const files = Array.from({ length: 25 }, (_, i) => ({ file: `f${i}.ts`, additions: 1, deletions: 0 }));
    const out = summarizeFiles(files, 20);
    expect(out).toContain("5 dosya daha");
  });
});
