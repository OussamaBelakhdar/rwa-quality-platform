/**
 * Configuration Playwright — WebKit et rien d'autre (ADR-005, borne 4).
 *
 * Ajouter Chromium ici dupliquerait la couverture Cypress sans rien prouver de
 * neuf : ce module n'existe que parce que `experimentalWebKitSupport` est resté
 * expérimental côté Cypress. Le jour où il ne l'est plus, ce dossier disparaît.
 */
import { defineConfig, devices } from "@playwright/test";
import path from "path";

const APP = process.env.PW_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/**/*.spec.ts", "support/auth.setup.ts"],
  // Cohérent avec la suite Cypress : l'isolation est garantie à l'ÉCRITURE
  // (chaque test sème son état), pas par l'ordre d'exécution.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // `runMode: 2` côté Cypress est une MESURE, pas une solution
  // (`.claude/rules/testing.md` #10). Même politique ici : zéro retry, un
  // échec est un échec.
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: APP,
    // Le MÊME attribut que la suite Cypress. `getByTestId` devient donc
    // l'équivalent de `cy.getBySel` — sans le typage de l'union `DataTestKey`,
    // et c'est une perte réelle : une faute de frappe redevient un échec à
    // l'exécution au lieu d'une erreur de compilation. Elle est nommée dans
    // ADR-005 comme une conséquence de la frontière, pas comme un oubli.
    testIdAttribute: "data-test",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    // La connexion a lieu UNE fois, dans son propre projet, et son résultat est
    // un fichier d'état. C'est l'équivalent Playwright de `cy.session` — même
    // besoin, mécanique entièrement différente, et c'est précisément le coût
    // que chiffre ADR-005 pour la couche L2.
    { name: "setup", testMatch: /support\/auth\.setup\.ts/, use: { ...devices["Desktop Safari"] } },
    {
      name: "webkit",
      // Le projet n'exécute QUE les specs : sans cette borne, il rejouerait
      // aussi `auth.setup.ts` — cette fois avec un état déjà authentifié, donc
      // sur une page qui redirige et ne montre aucun formulaire.
      testMatch: /tests\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Safari"],
        storageState: path.join(__dirname, ".auth", "utilisateur.json"),
      },
    },
  ],
});
