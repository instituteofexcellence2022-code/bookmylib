import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/immutability": "off",
      "prefer-const": "warn"
    }
  },
  {
    files: ["src/components/owner/attendance/**/*.{ts,tsx}", "src/actions/owner/attendance.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "prefer-const": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
