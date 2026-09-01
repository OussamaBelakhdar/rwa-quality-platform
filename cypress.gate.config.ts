import { defineConfig } from "cypress";

/**
 * Configuration DÉDIÉE au gate de surface de test (`yarn check:surface`).
 *
 * Volontairement minimale et séparée de `cypress.config.ts` :
 *   - pas de `supportFile`, donc aucune commande du projet n'est chargée. Rien
 *     ne peut masquer ce que le gate vérifie, et le `before()` global
 *     (`env:validate`) ne s'exécute pas — il réclamerait `yarn dev:test`, ce
 *     qui est exactement le contraire de ce qu'on teste ici.
 *   - pas de `setupNodeEvents`, donc aucune tâche, aucun proxy vers /testData.
 *   - `baseUrl` pointe sur `vite preview`, pas sur le serveur de dev.
 *
 * Un override `--config supportFile=false` ne suffit pas : `supportFile` vit
 * dans le bloc `e2e`, qu'un override de premier niveau n'atteint pas.
 */
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/build-gate/**/*.cy.{ts,tsx}",
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false,
    retries: { runMode: 0 },
  },
});
