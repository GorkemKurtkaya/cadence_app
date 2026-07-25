import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "src-tauri/target", "node_modules"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // console yalnız logger.ts içinde; genel kullanım uyarı.
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // logger console'a izinli tek yer.
    files: ["src/services/logger.ts"],
    rules: { "no-console": "off" },
  },
);
