import { describe, expect, it } from "vitest";
import { buildHardRules, buildReportPrompt, estimateTokens, renderTemplate } from "./prompt";
import type { CommitInfo } from "@/types";

function commit(partial: Partial<CommitInfo> = {}): CommitInfo {
  return {
    sha: "abc1234",
    committedAt: "2026-07-24T10:00:00Z",
    author: "me",
    message: "Rozet ekledim",
    body: "detay",
    files: [{ file: "Badge.tsx", additions: 10, deletions: 1 }],
    additions: 10,
    deletions: 1,
    filesChanged: 1,
    repoName: "novelify",
    repoPath: "/x/novelify",
    project: "Novelify",
    layer: "Frontend",
    source: "local",
    diffSummary: "  Badge.tsx (+10 / -1)",
    ...partial,
  };
}

describe("renderTemplate", () => {
  it("değişkenleri commit bağlamıyla doldurur", () => {
    const out = renderTemplate(
      "P:{{periyot}} T:{{tarih_araligi}} Proj:{{proje_listesi}} U:{{uzunluk}} Ton:{{ton}} Ist:{{istatistikler}}",
      "2026-07-24",
      [commit()],
      { period: "weekly", length: "short", tone: "samimi" },
    );
    expect(out).toContain("P:haftalık");
    expect(out).toContain("T:2026-07-24");
    expect(out).toContain("Proj:Novelify");
    expect(out).toContain("U:kısa");
    expect(out).toContain("Ton:samimi");
    expect(out).toContain("1 commit");
  });

  it("bilinmeyen değişkeni olduğu gibi bırakır", () => {
    expect(renderTemplate("{{bilinmeyen}}", "2026-07-24", [])).toBe("{{bilinmeyen}}");
  });
});

describe("buildReportPrompt", () => {
  it("şablon verildiğinde template modunu kullanır", () => {
    const out = buildReportPrompt("2026-07-24", [commit()], {
      sections: { summary: true, standup: false, technical: false },
      customInstructions: "",
      template: "Rapor: {{proje_listesi}}",
    });
    expect(out).toContain("Rapor: Novelify");
    expect(out).not.toContain("===OZET===");
  });

  it("şablon yoksa yapılandırılmış (işaretçili) modda kalır", () => {
    const out = buildReportPrompt("2026-07-24", [commit()], {
      sections: { summary: true, standup: false, technical: false },
      customInstructions: "",
    });
    expect(out).toContain("===OZET===");
  });

  it("custom şablon {{uzunluk}} içermese bile uzunluk kuralını sona ekler", () => {
    const out = buildReportPrompt("2026-07-24", [commit()], {
      sections: { summary: true, standup: false, technical: false },
      customInstructions: "",
      template: "Rapor yaz.", // uzunluk değişkeni yok
      length: "short",
    });
    expect(out).toContain("ZORUNLU KURALLAR");
    expect(out).toContain("4-10 kelime"); // kısa etiketi sonda garanti
    expect(out).toContain("Backend"); // BE/FE ayrım kuralı
  });
});

describe("buildHardRules", () => {
  it("seçilen uzunluğun etiketini ve BE/FE ayrım kuralını içerir", () => {
    const short = buildHardRules("short");
    expect(short).toContain("4-10 kelime");
    expect(short).toContain("Frontend");
    expect(buildHardRules("detailed")).toContain("enine boyuna");
  });
});

describe("estimateTokens", () => {
  it("~4 karakter/token", () => {
    expect(estimateTokens("abcd".repeat(10))).toBe(10);
  });
});
