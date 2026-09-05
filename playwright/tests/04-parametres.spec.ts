// WebKit change le résultat : le formulaire est contrôlé par Formik, et la
// validation à la frappe dépend des événements `input` et `change`, que WebKit
// n'émet pas toujours dans le même ordre que Chromium sur un champ effacé puis
// resaisi. Un champ qui reste marqué invalide bloquerait l'envoi.
import { expect, test } from "@playwright/test";
import { semer } from "../support/socle";

test.describe("Paramètres", () => {
  // La session vient du projet `setup` (voir playwright.config.ts) : elle est
  // établie une fois pour toute la suite. Ici on ne remet que la BASE dans un
  // état connu — l'équivalent strict du `cy.seed` du `beforeEach` côté Cypress.
  // Le seed est un fichier figé, donc les identifiants d'utilisateurs sont
  // stables : la session survit au reseed.
  test.beforeEach(async ({ request }) => {
    await semer(request);
  });

  test("persiste la modification du profil au-delà du rechargement", async ({ page }) => {
    const prenom = `Prenom${Date.now()}`;

    await page.goto("/user/settings");
    // PAS de `.locator("input")` ici, et c'est une différence RÉELLE avec le
    // formulaire de connexion. La semaine 8 a déplacé ces `data-test` sur
    // l'<input> lui-même (`UserSettingsForm.tsx`, prouvé par un test de
    // composant) ; chercher un input DANS l'input ne trouve rien. Les clés de
    // `signin-*`, elles, sont restées sur le conteneur MUI.
    await page.getByTestId("user-settings-firstName-input").fill(prenom);

    const enregistre = page.waitForResponse(
      (r) => r.request().method() === "PATCH" && /\/users\//.test(r.url())
    );
    await page.getByTestId("user-settings-submit").click();
    await enregistre;

    // Le rechargement est l'assertion : sans lui, la valeur relue pourrait
    // n'avoir jamais quitté le navigateur.
    await page.reload();
    await expect(page.getByTestId("user-settings-firstName-input")).toHaveValue(prenom);
  });
});
