// Niveau E2E : la persistance du profil traverse le formulaire, la machine
// utilisateur et l'API, et n'est observable qu'après un aller-retour serveur.
// La VALIDATION du même formulaire, elle, est déjà prouvée en test de composant
// (`src/components/UserSettingsForm.cy.tsx`) : la rejouer ici serait refusé par
// la grille ADR-004 — c'est exactement ce qui est arrivé à la sixième spec
// générée, voir docs/ia-revue.md §2.
//
// Corrigée depuis `docs/ia/brut/5-user-settings-maj.cy.ts.txt`, dont
// l'assertion `should('exist')` sur le formulaire était vraie avant comme après
// l'envoi.

import { interceptProfilEnregistre } from "@support/intercepts/domaines.intercepts";

describe(
  "Paramètres — mise à jour du profil",
  { tags: ["@user-settings", "@smoke", "@ai-generated"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
      cy.visit("/user/settings");
    });

    it("persiste les modifications au-delà du rechargement", () => {
      const enregistre = interceptProfilEnregistre();
      const prenom = `Prenom${Date.now()}`;

      cy.getBySel("user-settings-firstName-input").clear();
      cy.getBySel("user-settings-firstName-input").type(prenom);
      cy.getBySel("user-settings-lastName-input").clear();
      cy.getBySel("user-settings-lastName-input").type("Belakhdar");
      cy.getBySel("user-settings-submit").click();

      // ATTENDRE L'ENREGISTREMENT AVANT DE RECHARGER. `cy:burn` a mesuré 20 %
      // d'échec (1 sur 5) sans cette ligne : le rechargement partait parfois
      // avant que le PATCH n'ait quitté le navigateur, qui l'annulait. Le test
      // échouait alors sur une valeur non persistée — et l'application n'y
      // était pour rien.
      //
      // La réponse n'est pas une temporisation : c'est d'attendre l'ÉVÉNEMENT
      // qu'on cause. `cy.wait(500)` aurait masqué la course sans la supprimer,
      // et la règle #3 l'interdit précisément pour ça.
      cy.wait(enregistre).its("response.statusCode").should("eq", 204);

      // Le rechargement est l'assertion, pas une précaution : sans lui, la
      // valeur relue pourrait n'avoir jamais quitté le navigateur.
      cy.reload();
      cy.getBySel("user-settings-firstName-input").should("have.value", prenom);
      cy.getBySel("sidenav-user-full-name").should("contain", prenom);
    });
  }
);
