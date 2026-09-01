import {
  stubPublicTransactionsEnErreur,
  stubPublicTransactionsInjoignable,
} from "@support/intercepts/transactions.intercepts";

// Niveau E2E : le 500 et la coupure réseau n'existent que sur la pile réelle,
// et ce qui est vérifié ici est l'écart entre l'état de la machine et ce que
// l'utilisateur voit. Ni un test de composant ni `cy.request` ne peut le voir.

describe("Réseau — erreurs serveur", { tags: ["@network", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("une réponse 500 met la machine du flux public en échec", () => {
    const flux = stubPublicTransactionsEnErreur(500);

    cy.visit("/");
    cy.wait(flux);

    cy.appState("publicTransactions").should("eq", "failure");
  });

  it("une réponse 500 se rend comme une liste vide, sans message d'erreur", () => {
    const flux = stubPublicTransactionsEnErreur(500);

    cy.visit("/");
    cy.wait(flux);

    // DÉFAUT DE L'APPLICATION, pas du test. `dataMachine` a bien un état
    // `failure` avec un `message`, mais aucun composant ne le lit : le rendu
    // retombe sur `showEmptyList` (TransactionList.tsx:44). Une panne du
    // serveur est donc indiscernable d'un compte sans transaction.
    cy.getBySel("empty-list-header").should("be.visible");
    cy.contains(/error|erreur|retry|réessayer/i).should("not.exist");
  });

  it("une coupure réseau produit exactement le même rendu qu'un 500", () => {
    stubPublicTransactionsInjoignable();

    cy.visit("/");

    // Pas de `cy.wait` sur cet alias : `forceNetworkError` fait qu'aucune
    // réponse n'arrive jamais, et `cy.wait` échouerait sur « no response ever
    // occurred ». L'assertion sur l'état est retriable, elle suffit.
    cy.appState("publicTransactions").should("eq", "failure");
    cy.getBySel("empty-list-header").should("be.visible");
  });
});
