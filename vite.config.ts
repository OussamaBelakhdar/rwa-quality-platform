import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import istanbul from "vite-plugin-istanbul";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE");
  return {
    // expose all vite "VITE_*" variables as process.env.VITE_* in the browser
    define: {
      "process.env": env,
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: "build",
      sourcemap: true,
    },
    plugins: [
      react(),
      eslint(),
      istanbul({
        cypress: true,
        requireEnv: true,
        exclude: ["node_modules", "cypress", "dist"],
        forceBuildInstrument: true,
      }),
    ],
    // to get aws amplify to work with vite
    resolve: {
      alias: [
        {
          find: "./runtimeConfig",
          replacement: "./runtimeConfig.browser", // ensures browser compatible version of AWS JS SDK is used
        },
      ],
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setup-tests.js",
      // `playwright` EXCLU, et c'est plus qu'un réglage : la CI vient de
      // démontrer qu'un module « séparé » ne l'est que si chaque lanceur le
      // sait. Vitest ramasse `**/*.spec.ts` ; les 5 specs Playwright y sont
      // entrées d'un coup, ont tenté d'importer `@playwright/test` — absent du
      // node_modules racine par conception (ADR-005, borne 1) — et ont fait
      // échouer le job des tests unitaires. La séparation se déclare autant de
      // fois qu'il y a d'outils qui balaient le dépôt.
      exclude: ["node_modules", "cypress", "dist", "playwright"],
      fileParallelism: false, // #1666: Run tests sequentially to avoid race conditions with shared database.json file.
    },
  };
});
