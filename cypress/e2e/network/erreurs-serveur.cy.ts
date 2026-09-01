import { reponseTransactions } from "@fixtures/builders/transaction.builder";
import {
  interceptPublicTransactions,
  stubPublicTransactions,
  stubPublicTransactionsEnErreur,
  stubPublicTransactionsInjoignable,
} from "@support/intercepts/transactions.intercepts";
import type { EtatDonnees } from "@support/types";

// Niveau E2E : le 500 et la coupure réseau n'existent que sur la pile réelle.
// Ce qui est vérifié est le chemin complet erreur réseau → `dataMachine` →
// rendu, y compris le message porté par la machine. Ni un test de composant ni
// `cy.request` ne traverse cette chaîne.
//
// HISTORIQUE — ces tests ont d'abord CONSTATÉ un défaut : les trois causes
// ci-dessous produisaient toutes l'écran « No Transactions ». Le défaut est
// corrigé (`TransactionList.tsx`, `dataMachine.ts`) ; la spec vérifie
// désormais que les causes sont DISTINGUÉES, et empêche le retour en arrière.

/** Écran d'erreur : un message issu de la machine, et une sortie. */
const ecranDErreur = (message: string): void => {
  cy.getBySel("transaction-list-error").should("be.visible");
  // `have.text` sur le message : c'est ce qui prouve que la machine porte une
  // erreur EXPLOITABLE. `setMessage` lisait `event.message` alors que XState
  // range l'erreur dans `event.data` — le message était toujours vide.
  cy.getBySel("transaction-list-error-message").should("have.text", message);
  // Une erreur sans sortie est une impasse : le bouton fait partie du contrat.
  cy.getBySel("transaction-list-error-retry").should("be.visible");
  // Et surtout : plus l'écran « aucune donnée ».
  cy.getBySel("empty-list-header").should("not.exist");
};

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

  it("une réponse 500 affiche l'erreur du serveur, pas une liste vide", () => {
    const flux = stubPublicTransactionsEnErreur(500);

    cy.visit("/");
    cy.wait(flux);

    ecranDErreur("Request failed with status code 500");
  });

  it("une coupure réseau affiche l'erreur de transport", () => {
    stubPublicTransactionsInjoignable();

    cy.visit("/");

    // Pas de `cy.wait` : `forceNetworkError` fait qu'aucune réponse n'arrive
    // jamais, et `cy.wait` échouerait sur « no response ever occurred ».
    // Le message diffère de celui du 500 : les deux causes sont distinguées
    // jusque dans ce que l'utilisateur lit.
    ecranDErreur("Network Error");
  });

  it("une réponse 200 sans résultat reste une liste vide, distincte d'une erreur", () => {
    const flux = stubPublicTransactions(reponseTransactions([]));

    cy.visit("/");
    cy.wait(flux);

    const succesSansDonnee: EtatDonnees = { success: "withoutData" };
    cy.appState("publicTransactions").should("deep.equal", succesSansDonnee);
    cy.getBySel("empty-list-header").should("have.text", "No Transactions");
    cy.getBySel("transaction-list-error").should("not.exist");
  });

  it("le bouton de reprise relance la requête et rétablit la liste", () => {
    // `times: 1` : la panne ne dure qu'une requête. Un espion déclaré après le
    // stub ne suffisait pas — à matcher identique, le stub continue de servir.
    const erreur = stubPublicTransactionsEnErreur(500, 1);

    cy.visit("/");
    cy.wait(erreur);
    cy.getBySel("transaction-list-error").should("be.visible");

    // L'espion est déclaré ICI et non avant le `visit` : sinon il aliase la
    // requête initiale — celle qui a échoué — et `cy.wait` rendrait ce 500-là
    // au lieu de la reprise. L'alias se consomme dans l'ordre d'arrivée.
    const reprise = interceptPublicTransactions();
    cy.getBySel("transaction-list-error-retry").click();

    cy.wait(reprise).its("response.statusCode").should("eq", 200);
    cy.getBySel("transaction-list-error").should("not.exist");
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
  });
});
