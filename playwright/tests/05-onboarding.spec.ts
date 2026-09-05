// WebKit change le résultat : l'onboarding est une boîte de dialogue modale qui
// piège le focus. La gestion du focus dans un dialogue est l'un des points où
// WebKit diverge le plus de Chromium — un piège de focus cassé rend le parcours
// infranchissable au clavier sans qu'aucun test Chromium ne le voie.
import { expect, test } from "@playwright/test";
import { connecter } from "../support/session";
import { MOT_DE_PASSE, semer } from "../support/socle";

interface UtilisateurSeed {
  id: string;
  username: string;
}

test.describe("Onboarding", () => {
  test("accueille par une modale l'utilisateur sans compte bancaire", async ({
    page,
    context,
    request,
  }) => {
    await semer(request);

    // Un utilisateur SANS compte bancaire déclenche l'onboarding. On le crée par
    // l'API de test plutôt que d'en présumer un dans le seed : la spec ne doit
    // pas dépendre d'un enregistrement qu'une régénération du seed déplacerait.
    const nouveau = await request.post("http://localhost:3001/testData/user", {
      data: {
        firstName: "Nouvelle",
        lastName: "Venue",
        username: `pw_${Date.now()}`,
        email: `pw_${Date.now()}@exemple.test`,
        phoneNumber: "615-555-1212",
        avatar: "https://exemple.test/a.png",
        defaultPrivacyLevel: "public",
        password: MOT_DE_PASSE,
        withBankAccount: false,
      },
    });
    expect(nouveau.ok()).toBeTruthy();
    const { user } = (await nouveau.json()) as { user: UtilisateurSeed };

    await connecter(context, request, user.username);
    await page.goto("/");

    await expect(page.getByTestId("user-onboarding-dialog")).toBeVisible();
  });
});
