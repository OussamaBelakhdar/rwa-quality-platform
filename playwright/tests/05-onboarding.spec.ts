// WebKit change le résultat : l'onboarding est une boîte de dialogue modale qui
// piège le focus. La gestion du focus dans un dialogue est l'un des points où
// WebKit diverge le plus de Chromium — un piège de focus cassé rend le parcours
// infranchissable au clavier sans qu'aucun test Chromium ne le voie.
import { expect, test } from "@playwright/test";
import { MOT_DE_PASSE, semer } from "../support/socle";

// ÉTAT VIERGE OBLIGATOIRE, et ce n'est pas un détail de configuration.
//
// La première rédaction héritait de l'état du projet `setup` — donc de la
// session de Heath93 — puis créait un utilisateur et croyait le connecter. La
// page restait connectée en Heath93, qui A un compte bancaire. Le test passait
// quand même : la `Dialog` MUI est montée à `open=false` puis rendue le temps
// que la machine des comptes réponde, et `toBeVisible()` attrapait cette
// fenêtre de course.
//
// Un test vert qui n'observe pas ce qu'il annonce — exactement le premier
// défaut relevé dans docs/ia-revue.md, commis ici par moi. Trouvé en sondant
// l'utilisateur réellement affiché, pas en relisant le code.
test.use({ storageState: { cookies: [], origins: [] } });

interface UtilisateurSeed {
  id: string;
  username: string;
}

/** Crée un utilisateur par l'API de test. `withBankAccount` décide de l'onboarding. */
async function creerUtilisateur(
  request: import("@playwright/test").APIRequestContext,
  avecCompte: boolean
): Promise<UtilisateurSeed> {
  const marque = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const reponse = await request.post("http://localhost:3001/testData/user", {
    data: {
      firstName: "Nouvelle",
      lastName: "Venue",
      username: `pw_${marque}`,
      email: `pw_${marque}@exemple.test`,
      phoneNumber: "615-555-1212",
      avatar: "https://exemple.test/a.png",
      defaultPrivacyLevel: "public",
      password: MOT_DE_PASSE,
      withBankAccount: avecCompte,
    },
  });
  expect(reponse.ok()).toBeTruthy();
  const { user } = (await reponse.json()) as { user: UtilisateurSeed };
  return user;
}

/** Connexion par l'UI : c'est la seule façon d'obtenir la session d'un utilisateur créé à la volée. */
async function connecter(page: import("@playwright/test").Page, username: string): Promise<void> {
  await page.goto("/signin");
  await page.getByTestId("signin-username").locator("input").fill(username);
  await page.getByTestId("signin-password").locator("input").fill(MOT_DE_PASSE);
  await page.getByTestId("signin-submit").click();
  // On ne poursuit qu'une fois la session RÉELLEMENT établie, et sur le bon
  // utilisateur : c'est la ligne qui aurait fait échouer la version précédente.
  await expect(page.getByTestId("sidenav-username")).toContainText(username);
}

test.describe("Onboarding", () => {
  test.beforeEach(async ({ request }) => {
    await semer(request);
  });

  test("accueille par une modale l'utilisateur sans compte bancaire", async ({ page, request }) => {
    const nouveau = await creerUtilisateur(request, false);
    await connecter(page, nouveau.username);

    await expect(page.getByTestId("user-onboarding-dialog")).toBeVisible();
  });

  test("n'affiche aucune modale à l'utilisateur qui a déjà un compte", async ({
    page,
    request,
  }) => {
    // CONTRÔLE NÉGATIF, et il est indispensable ici : sans lui, une modale
    // affichée à TOUT LE MONDE ferait passer le premier test. C'est ce qui
    // arrivait avant, et rien ne le disait.
    const equipe = await creerUtilisateur(request, true);
    await connecter(page, equipe.username);

    await expect(page.getByTestId("user-onboarding-dialog")).toHaveCount(0);
  });
});
