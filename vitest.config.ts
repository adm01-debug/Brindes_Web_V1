import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Configuração isolada de testes: não carrega os plugins do app (TanStack
 * Router/Start), que dependem de geração de rotas e não têm papel nos testes
 * unitários de lógica pura.
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
