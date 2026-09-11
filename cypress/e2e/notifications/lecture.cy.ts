// Niveau E2E : marquer une notification comme lue traverse l'UI, la machine
// XState des notifications et l'API (PATCH), puis DEUX composants distincts se
// re-rendent — la liste et le compteur du bandeau. C'est cette propagation qui
// est en jeu ; un test de composant n'a pas la machine, `cy.request` n'a pas le
// re-rendu (ADR-004).
//
// Corrigée depuis `docs/ia/brut/2-notifications-compteur.cy.ts.txt`. La version
// générée asserted `not.equal` : elle passait aussi si le compteur MONTAIT, ce
// qui serait précisément le bug. Voir docs/ia-revue.md §2.
//
// ── Deux points appris en l'écrivant, gardés ici plutôt que dans le corps ──
//
// 1. Le badge est rendu AVANT que la machine n'ait reçu les notifications. Le
//    lire à ce moment donne `''`, et `Number("")` vaut 0 : le test a échoué sur
//    `expected '-1'`. La valeur n'était pas fausse par hasard, elle était lue
//    trop tôt. D'où l'attente sur la LISTE avant toute lecture du compteur.
//
// 2. L'extraction de l'identifiant est descendue en L2 (`cy.premierIdDe`,
//    règle #4). Dupliquée dans deux specs, elle poussait ce `it` à 37 lignes —
//    au-delà des 25 de la règle #5, qui existe parce qu'un `it` long mélange la
//    préparation et le comportement. C'était exactement le cas.
import { interceptNotificationLue } from "@support/intercepts/domaines.intercepts";

describe("Notifications — lecture", { tags: ["@notifications", "@smoke", "@ai-generated"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/notifications");
  });

  it("retire la notification lue de la liste et décrémente le compteur", () => {
    const lue = interceptNotificationLue();
    cy.getBySelLike("notification-list-item").should("have.length.greaterThan", 0);

    cy.getBySel("nav-top-notifications-count")
      .invoke("text")
      .then((texte) => {
        const avant = Number(texte.trim());

        cy.premierIdDe("notification-list-item").then((id) => {
          cy.getBySelWithId("notification-mark-read", id).click();
          cy.wait(lue).its("response.statusCode").should("eq", 204);
          cy.getBySelWithId("notification-list-item", id).should("not.exist");
        });

        // Égalité EXACTE et décroissante : `GET /notifications` ne rend que
        // les non-lues (`backend/database.ts:732`), donc un de moins.
        cy.getBySel("nav-top-notifications-count")
          .invoke("text")
          .invoke("trim")
          .should("eq", String(avant - 1));
      });
  });
});
