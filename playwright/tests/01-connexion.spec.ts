// WebKit change le résultat : la soumission d'un formulaire et la pose du cookie
// de session suivent des règles de SameSite et de politique de stockage propres
// à WebKit — c'est le moteur qui refuse le plus souvent un cookie que Chromium
// accepte. Un login vert sur Chromium ne dit rien de Safari (ADR-005, borne 5).
import { expect, test } from "@playwright/test";
import { MOT_DE_PASSE, semer } from "../support/socle";

// LA SEULE SPEC QUI PART DÉCONNECTÉE, et c'est structurel : elle a pour objet
// le formulaire de connexion. L'état partagé du projet `setup` la ferait
// atterrir sur le tableau de bord, où il n'y a pas de formulaire à remplir.
//
// C'est l'équivalent Playwright de la règle #2 du projet — le login par l'UI
// n'est testé QUE là où il est le sujet. Ailleurs il est une précondition, et
// une précondition ne se rejoue pas par l'interface.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Connexion", () => {
  test.beforeEach(async ({ request }) => {
    await semer(request);
  });

  test("connecte un utilisateur du seed et le mène à son tableau de bord", async ({ page }) => {
    await page.goto("/signin");

    await page.getByTestId("signin-username").locator("input").fill("Heath93");
    await page.getByTestId("signin-password").locator("input").fill(MOT_DE_PASSE);
    await page.getByTestId("signin-submit").click();

    await expect(page.getByTestId("sidenav-username")).toBeVisible();
  });

  test("refuse un mot de passe faux sans laisser entrer", async ({ page }) => {
    await page.goto("/signin");

    await page.getByTestId("signin-username").locator("input").fill("Heath93");
    await page.getByTestId("signin-password").locator("input").fill("mauvais-mot-de-passe");
    await page.getByTestId("signin-submit").click();

    await expect(page.getByTestId("signin-error")).toBeVisible();
    // L'assertion qui compte : pas seulement « une erreur s'affiche », mais
    // « la session n'existe pas ». Un message d'erreur AVEC une session ouverte
    // serait le pire des deux mondes, et seule cette ligne l'attrape.
    await expect(page.getByTestId("sidenav-username")).toHaveCount(0);
  });
});
