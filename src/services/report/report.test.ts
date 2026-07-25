import { describe, it, expect } from "vitest";
import { buildReportPrompt, renderCommitsForPrompt, SECTION_MARKERS } from "./prompt";
import { parseReportSections } from "./parse";
import type { CommitInfo } from "@/types";

const commit: CommitInfo = {
  sha: "abc",
  committedAt: "2026-07-24T14:30:00+03:00",
  author: "Görkem",
  message: "feat: today ekranı",
  body: "Bugün sekmesi eklendi.",
  files: [{ file: "src/App.tsx", additions: 10, deletions: 2 }],
  additions: 10,
  deletions: 2,
  filesChanged: 1,
  repoName: "rapor_app",
  repoPath: "/x/rapor_app",
  project: "Rapor App",
  layer: "Frontend",
  source: "local",
  diffSummary: "",
};

describe("buildReportPrompt", () => {
  it("üç bölüm işaretçisini de içerir", () => {
    const p = buildReportPrompt("2026-07-24", [commit]);
    expect(p).toContain(SECTION_MARKERS.summary);
    expect(p).toContain(SECTION_MARKERS.standup);
    expect(p).toContain(SECTION_MARKERS.technical);
    expect(p).toContain("rapor_app");
    expect(p).toContain("feat: today ekranı");
  });

  it("commit yoksa uygun metin koyar", () => {
    expect(renderCommitsForPrompt([])).toContain("commit bulunamadı");
  });

  it("yalnızca seçili bölümlerin işaretçisini koyar", () => {
    const p = buildReportPrompt("2026-07-24", [commit], {
      sections: { summary: true, standup: false, technical: false },
      customInstructions: "",
    });
    expect(p).toContain(SECTION_MARKERS.summary);
    expect(p).not.toContain(SECTION_MARKERS.standup);
    expect(p).not.toContain(SECTION_MARKERS.technical);
  });

  it("ek talimatları prompt'a yansıtır", () => {
    const p = buildReportPrompt("2026-07-24", [commit], {
      sections: { summary: true, standup: true, technical: true },
      customInstructions: "emoji kullanma",
    });
    expect(p).toContain("emoji kullanma");
    expect(p).toContain("EK TALİMATLAR");
  });

  it("hiç bölüm seçilmezse en az özeti üretir", () => {
    const p = buildReportPrompt("2026-07-24", [commit], {
      sections: { summary: false, standup: false, technical: false },
      customInstructions: "",
    });
    expect(p).toContain(SECTION_MARKERS.summary);
  });
});

describe("parseReportSections", () => {
  it("işaretçili çıktıyı 3 bölüme ayırır", () => {
    const raw = [
      `${SECTION_MARKERS.summary}`,
      "Bugün today ekranını yaptım.",
      `${SECTION_MARKERS.standup}`,
      "- Dün: iskele\n- Bugün: today",
      `${SECTION_MARKERS.technical}`,
      "App.tsx değişti.",
    ].join("\n");
    const r = parseReportSections(raw);
    expect(r.summaryMd).toBe("Bugün today ekranını yaptım.");
    expect(r.standupMd).toContain("Dün: iskele");
    expect(r.technicalMd).toBe("App.tsx değişti.");
  });

  it("işaretçi yoksa her şeyi özete koyar", () => {
    const r = parseReportSections("düz metin rapor");
    expect(r.summaryMd).toBe("düz metin rapor");
    expect(r.standupMd).toBe("");
    expect(r.technicalMd).toBe("");
  });

  it("boş girdiyi tolere eder", () => {
    const r = parseReportSections("");
    expect(r).toEqual({ summaryMd: "", standupMd: "", technicalMd: "" });
  });
});
