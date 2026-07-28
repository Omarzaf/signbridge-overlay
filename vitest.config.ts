import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    passWithNoTests: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "tests/unit/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
