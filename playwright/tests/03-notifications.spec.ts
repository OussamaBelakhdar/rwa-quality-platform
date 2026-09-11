// WebKit change le résultat : marquer une notification lue déclenche un PATCH
// puis un re-rendu de deux composants distincts. Les moteurs diffèrent sur
// l'ordonnancement des micro-tâches après une réponse réseau — c'est là que
// naissent les « ça marche sur Chrome » des interfaces réactives.
import { expect, test } from "@playwright/test";
import { connecter } from "../support/session";
import { semer } from "../support/socle";

test.describe("Notifications", () => {
  test.beforeEach(async ({ page, request }) => {
    await semer(request);
    await connecter(page, "Heath93");
  });

  test("retire de la liste la notification marquée comme lue", async ({ page }) => {
    await page.goto("/notifications");

    const premier = page.getByTestId(/^notification-list-item-/).first();
    await expect(premier).toBeVisible();
    // Lu APRÈS que la liste soit rendue : le badge vaut `''` tant que la machine
    // n'a pas répondu, et `Number("")` donnerait 0. Même piège que côté Cypress.
    const avant = await page.getByTestId("nav-top-notifications-count").textContent();
    const cle = await premier.getAttribute("data-test");
    const id = String(cle).replace("notification-list-item-", "");

    await page.getByTestId(`notification-mark-read-${id}`).click();

    await expect(page.getByTestId(`notification-list-item-${id}`)).toHaveCount(0);

    // LE COMPTEUR AUSSI, et c'est une correction relevée par `test-reviewer`.
    // L'en-tête de ce fichier justifie son existence par la propagation à DEUX
    // composants distincts — c'est là que les moteurs divergent. Le corps n'en
    // vérifiait qu'un. Le test n'observait donc pas ce que sa propre raison
    // d'être annonçait : la moitié du risque cité restait non couverte.
    await expect(page.getByTestId("nav-top-notifications-count")).toHaveText(
      String(Number(avant) - 1)
    );
  });
});
