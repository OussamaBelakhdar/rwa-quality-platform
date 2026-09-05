// WebKit change le résultat : le formulaire est contrôlé par Formik, et la
// validation à la frappe dépend des événements `input` et `change`, que WebKit
// n'émet pas toujours dans le même ordre que Chromium sur un champ effacé puis
// resaisi. Un champ qui reste marqué invalide bloquerait l'envoi.
import { expect, test } from "@playwright/test";
import { connecter } from "../support/session";
import { semer } from "../support/socle";

test.describe("Paramètres", () => {
  test.beforeEach(async ({ page, request }) => {
    await semer(request);
    await connecter(page, "Heath93");
  });

  // ── DIVERGENCE DE MOTEUR CONFIRMÉE — WEBKIT ────────────────────────────────
  //
  // `test.fail()` déclare que ce test DOIT échouer aujourd'hui. Ce n'est ni une
  // quarantaine ni un contournement : le test reste exécuté, et le jour où
  // l'application est corrigée, il repassera au VERT et cette ligne le fera
  // échouer. Le défaut ne peut donc pas être oublié en silence.
  //
  // ── Ce qui est mesuré ──
  //   · rechargement SANS mise à jour du profil, sur WebKit  → passe
  //   · rechargement APRÈS un PATCH /users/:id (204)         → ÉCHOUE, la page
  //     revient sur l'écran de connexion avec « Network Error »
  //   · le MÊME parcours dans la suite Cypress (Electron)    → passe
  //
  // Isolé par sonde, pas déduit : deux tests identiques ne différant que par la
  // présence du PATCH. Le PATCH répond bien 204 ; c'est le rechargement qui
  // suit qui perd la session, et seulement sur WebKit.
  //
  // ── Pourquoi le test n'est pas affaibli pour passer ──
  // Retirer le rechargement rendrait le test vert et sans valeur : c'est lui
  // qui prouve la persistance. La semaine 7 a déjà tranché ce dilemme — « la
  // quarantaine isole un test instable, elle ne fait pas taire une application
  // cassée ». Ici le test a raison et l'application a tort.
  //
  // C'est la première découverte du module, le jour de son entrée, et elle est
  // exactement ce qu'ADR-005 annonçait chercher : ce que Chromium cache.
  test.fail();
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
