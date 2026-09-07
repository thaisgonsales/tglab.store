import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Por defecto Node (lógica de dominio). Los tests de componentes usan
    // `// @vitest-environment jsdom` en su cabecera.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "tests/e2e/**",
      "tests/integration/**",
      "node_modules/**",
      ".next/**",
    ],
    clearMocks: true,
  },
});
