/**
 * Configuration Playwright — WebKit et rien d'autre (ADR-005, borne 4).
 *
 * Ajouter Chromium ici dupliquerait la couverture Cypress sans rien prouver de
 * neuf : ce module n'existe que parce que `experimentalWebKitSupport` est resté
 * expérimental côté Cypress. Le jour où il ne l'est plus, ce dossier disparaît.
 */
import { defineConfig, devices } from "@playwright/test";

const APP = process.env.PW_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
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
    // UN SEUL projet, et plus de `setup` : l'état de session partagé ne
    // survivait pas au reseed (voir support/session.ts). Chaque test se
    // connecte, ce qui coûte environ une seconde et achète l'isolation.
    { name: "webkit", use: { ...devices["Desktop Safari"], testIdAttribute: "data-test" } },
  ],
});
