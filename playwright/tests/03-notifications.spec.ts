// WebKit change le résultat : marquer une notification lue déclenche un PATCH
// puis un re-rendu de deux composants distincts. Les moteurs diffèrent sur
// l'ordonnancement des micro-tâches après une réponse réseau — c'est là que
// naissent les « ça marche sur Chrome » des interfaces réactives.
import { expect, test } from "@playwright/test";
import { semer } from "../support/socle";

test.describe("Notifications", () => {
  // La session vient du projet `setup` (voir playwright.config.ts) : elle est
  // établie une fois pour toute la suite. Ici on ne remet que la BASE dans un
  // état connu — l'équivalent strict du `cy.seed` du `beforeEach` côté Cypress.
  // Le seed est un fichier figé, donc les identifiants d'utilisateurs sont
  // stables : la session survit au reseed.
  test.beforeEach(async ({ request }) => {
    await semer(request);
  });

  test("retire de la liste la notification marquée comme lue", async ({ page }) => {
    await page.goto("/notifications");

    const premier = page.getByTestId(/^notification-list-item-/).first();
    await expect(premier).toBeVisible();
    const cle = await premier.getAttribute("data-test");
    const id = String(cle).replace("notification-list-item-", "");

    await page.getByTestId(`notification-mark-read-${id}`).click();

    await expect(page.getByTestId(`notification-list-item-${id}`)).toHaveCount(0);
  });
});
