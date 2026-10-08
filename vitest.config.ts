import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // tests share one database, so run one file at a time
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) }, // makes "@/lib/..." work in tests
  },
});