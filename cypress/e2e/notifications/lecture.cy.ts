// Niveau E2E : marquer une notification comme lue traverse l'UI, la machine
// XState des notifications et l'API (PATCH), puis DEUX composants distincts se
// re-rendent — la liste et le compteur du bandeau. C'est cette propagation qui
// est en jeu ; un test de composant n'a pas la machine, `cy.request` n'a pas le
// re-rendu (ADR-004).
//
// Corrigée depuis `docs/ia/brut/2-notifications-compteur.cy.ts.txt`. La version
// générée asserted `not.equal` : elle passait aussi si le compteur MONTAIT, ce
// qui serait précisément le bug. Voir docs/ia-revue.md §2.
import { interceptNotificationLue } from "@support/intercepts/domaines.intercepts";

describe("Notifications — lecture", { tags: ["@notifications", "@smoke", "@ai-generated"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/notifications");
  });

  it("retire la notification lue de la liste et décrémente le compteur", () => {
    const lue = interceptNotificationLue();

    // GARDE-FOU D'ABORD, LECTURE ENSUITE. Sans cette ligne le test a échoué
    // avec `expected '-1'` : le badge est rendu AVANT que la machine n'ait reçu
    // les notifications, son texte est alors vide, et `Number("")` vaut 0. La
    // valeur capturée n'était pas fausse par hasard — elle était capturée trop
    // tôt. `.should()` sur la liste attend le chargement réel, et c'est ce
    // chargement qui garantit que le badge porte un nombre.
    cy.getBySelLike("notification-list-item").should("have.length.greaterThan", 0);

    cy.getBySel("nav-top-notifications-count")
      .invoke("text")
      .then((texte) => {
        // Valeur PASSÉE, capturée avant l'action : la comparer plus tard est
        // légitime. Ce qui ne l'est pas, c'est de figer un état qu'on
        // attendra ensuite — c'est le défaut de la spec 4 générée.
        const avant = Number(texte.trim());

        cy.getBySelLike("notification-list-item")
          .first()
          .invoke("attr", "data-test")
          .then((cle) => {
            const id = String(cle).replace("notification-list-item-", "");

            cy.getBySelWithId("notification-mark-read", id).click();
            cy.wait(lue).its("response.statusCode").should("eq", 204);

            cy.getBySelWithId("notification-list-item", id).should("not.exist");
            // Égalité EXACTE et décroissante. `GET /notifications` ne rend que
            // les non-lues (`backend/database.ts:732`), donc le compteur doit
            // valoir exactement un de moins — pas « autre chose ».
            cy.getBySel("nav-top-notifications-count")
              .invoke("text")
              .invoke("trim")
              .should("eq", String(avant - 1));
          });
      });
  });
});
