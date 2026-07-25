import { describe, expect, it } from "vitest";
import { deriveArea } from "./area";

describe("deriveArea", () => {
  it("frontend uzantılarını fe olarak sınıflar", () => {
    expect(deriveArea(["src/components/Button.tsx", "styles/app.css"])).toBe("fe");
  });

  it("backend uzantılarını be olarak sınıflar", () => {
    expect(deriveArea(["api/service.py", "models.py"])).toBe("be");
  });

  it("baskın alanı seçer", () => {
    expect(deriveArea(["a.py", "b.py", "c.tsx"])).toBe("be");
  });

  it("belirsiz uzantıda yol ipucuna bakar", () => {
    expect(deriveArea(["backend/router.ts"])).toBe("be");
    expect(deriveArea(["components/Card.ts"])).toBe("fe");
  });

  it("sınıflanamayan/boş girdide other döner", () => {
    expect(deriveArea([])).toBe("other");
    expect(deriveArea(["README.md", "data.json"])).toBe("other");
  });
});
