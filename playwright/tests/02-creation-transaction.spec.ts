// WebKit change le résultat : la saisie d'un montant passe par un champ masqué
// (formatage monétaire) dont le comportement dépend du moteur d'édition de
// texte. WebKit gère différemment la position du curseur et les événements de
// composition — c'est le parcours où une divergence de moteur se voit d'abord.
import { expect, test } from "@playwright/test";
import { semer } from "../support/socle";

test.describe("Création de transaction", () => {
  // La session vient du projet `setup` (voir playwright.config.ts) : elle est
  // établie une fois pour toute la suite. Ici on ne remet que la BASE dans un
  // état connu — l'équivalent strict du `cy.seed` du `beforeEach` côté Cypress.
  // Le seed est un fichier figé, donc les identifiants d'utilisateurs sont
  // stables : la session survit au reseed.
  test.beforeEach(async ({ request }) => {
    await semer(request);
  });

  test("crée un paiement et l'affiche dans l'historique personnel", async ({ page }) => {
    const description = `Déjeuner ${Date.now()}`;

    await page.goto("/transaction/new");
    await page
      .getByTestId(/^user-list-item-/)
      .first()
      .click();

    await page.getByTestId("transaction-create-amount-input").locator("input").fill("25");
    await page
      .getByTestId("transaction-create-description-input")
      .locator("input")
      .fill(description);
    await page.getByTestId("transaction-create-submit-payment").click();

    // La transaction doit apparaître dans l'historique PERSONNEL, pas seulement
    // sur l'écran de confirmation : c'est la persistance qui est testée, pas le
    // rendu d'un formulaire soumis.
    await page.goto("/personal");
    await expect(page.getByText(description)).toBeVisible();
  });
});
