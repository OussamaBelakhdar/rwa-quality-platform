import path from "path";
import { defineConfig, mergeConfig, loadEnv } from "vite";
import viteConfig from "./vite.config";

export default defineConfig(({ mode } = { mode: "development", command: "serve" }) =>
  mergeConfig(
    viteConfig({ mode, command: "serve" }),
    defineConfig({
      define: {
        "process.env": loadEnv("development", process.cwd(), "VITE"),
      },
      /**
       * Alias de la couche de test — semaine 8.
       *
       * `@support/*`, `@plugins/*`, `@fixtures/*` et `@models/*` ne vivaient
       * que dans `cypress/tsconfig.json`, lu par le préprocesseur webpack de
       * l'E2E. Le component testing passe par VITE, qui les ignorait : le
       * fichier de support échouait à se charger, et le premier test montait
       * sur « Failed to fetch dynamically imported module ».
       *
       * Ils sont déclarés ici et non dans `vite.config.ts` : l'application
       * livrée n'a aucune raison de résoudre les chemins du code de test.
       */
      resolve: {
        alias: [
          { find: /^@support\//, replacement: path.resolve(__dirname, "cypress/support") + "/" },
          { find: /^@plugins\//, replacement: path.resolve(__dirname, "cypress/plugins") + "/" },
          { find: /^@fixtures\//, replacement: path.resolve(__dirname, "cypress/fixtures") + "/" },
          { find: /^@models\//, replacement: path.resolve(__dirname, "src/models") + "/" },
        ],
      },
      server: {
        /**
         * start the CT dev server on a different port than the full RWA
         * so users can switch between CT and E2E testing without having to
         * stop/start the RWA dev server.
         */
        port: 3002,
      },
    })
  )
);
