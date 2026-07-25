import { describe, it, expect } from "vitest";
import { deriveProject } from "./project";

describe("deriveProject", () => {
  it("backend ekini ayırır ve projeyi güzelleştirir", () => {
    expect(deriveProject("story_app_backend")).toEqual({ project: "Story App", layer: "Backend" });
  });

  it("frontend ekini ayırır", () => {
    expect(deriveProject("ozflix_frontend")).toEqual({ project: "Ozflix", layer: "Frontend" });
  });

  it("adminpanel'i frontend sayar", () => {
    expect(deriveProject("boilerplate_frontend_adminpanel").layer).toBe("Frontend");
  });

  it("api ekini backend sayar", () => {
    expect(deriveProject("finance-api")).toEqual({ project: "Finance", layer: "Backend" });
  });

  it("ek yoksa Diğer döner", () => {
    expect(deriveProject("otp-extension")).toEqual({ project: "Otp Extension", layer: "Diğer" });
  });
});
