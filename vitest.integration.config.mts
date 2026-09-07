import path from "node:path";
import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Config para pruebas de integración que tocan la base de datos.
 * Requiere `.env` con DATABASE_URL y el Postgres local corriendo.
 *
 *   npm run test:integration
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `import "server-only"` es un no-op fuera de Next.
      "server-only": path.join(here, "tests/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.{test,spec}.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});
