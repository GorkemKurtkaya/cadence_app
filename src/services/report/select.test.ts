import { describe, it, expect } from "vitest";
import { filterBySelectedShas } from "./select";

const commits = [
  { sha: "aaa1", message: "bir" },
  { sha: "bbb2", message: "iki" },
  { sha: "ccc3", message: "üç" },
];

describe("filterBySelectedShas", () => {
  it("shas undefined → tüm commit'ler döner", () => {
    expect(filterBySelectedShas(commits, undefined)).toEqual(commits);
  });

  it("shas boş dizi → tüm commit'ler döner (hepsi)", () => {
    expect(filterBySelectedShas(commits, [])).toEqual(commits);
  });

  it("alt küme → yalnız seçili SHA'lar süzülür ve sıra korunur", () => {
    expect(filterBySelectedShas(commits, ["ccc3", "aaa1"])).toEqual([
      { sha: "aaa1", message: "bir" },
      { sha: "ccc3", message: "üç" },
    ]);
  });

  it("eşleşmeyen SHA → boş liste", () => {
    expect(filterBySelectedShas(commits, ["yok"])).toEqual([]);
  });
});
