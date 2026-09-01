import { reponseTransactions } from "@fixtures/builders/transaction.builder";
import {
  stubPublicTransactions,
  stubPublicTransactionsEnErreur,
  stubPublicTransactionsInjoignable,
} from "@support/intercepts/transactions.intercepts";
import type { EtatDonnees } from "@support/types";

// Niveau E2E : le 500 et la coupure réseau n'existent que sur la pile réelle,
// et ce qui est vérifié ici est l'écart entre l'état de la machine et ce que
// l'utilisateur voit. Ni un test de composant ni `cy.request` ne peut le voir.

/**
 * Le rendu que l'application produit pour TROIS causes différentes : une
 * erreur serveur, une coupure de transport, et un succès sans résultat.
 *
 * Cette fonction est locale au fichier et partagée par les trois tests
 * volontairement. Ce que la spec démontre n'est pas « chacun affiche une liste
 * vide » — trois assertions recopiées le diraient aussi, et divergeraient au
 * premier correctif. C'est « les trois passent par la MÊME assertion » : le
 * jour où l'application distinguera l'une des causes, ce test-là échouera, et
 * l'écart deviendra visible au lieu de rester une coïncidence de rédaction.
 */
const memeEcranQuAucuneDonnee = (): void => {
  // `have.text` et non `be.visible` : « visible » serait vrai pour n'importe
  // quel contenu. Ce que la spec doit fixer, c'est la CHAÎNE exacte que les
  // trois causes produisent — sinon « le même écran » reste une figure de
  // style. `EmptyList.tsx:29` rend « No {entity} ».
  cy.getBySel("empty-list-header").should("have.text", "No Transactions");
  // La liste elle-même n'est pas seulement vide : elle n'est pas rendue
  // (`TransactionList.tsx:51` la conditionne à `transactions.length > 0`).
  cy.getBySel("transaction-list").should("not.exist");
  cy.contains(/error|erreur|retry|réessayer/i).should("not.exist");
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

    // La CAUSE est bien captée : c'est ce qui rend le test suivant accablant.
    cy.appState("publicTransactions").should("eq", "failure");
  });

  it("une réponse 500 se rend comme une liste vide, sans message d'erreur", () => {
    const flux = stubPublicTransactionsEnErreur(500);

    cy.visit("/");
    cy.wait(flux);

    // DÉFAUT DE L'APPLICATION, pas du test. `dataMachine` a bien un état
    // `failure` avec un `message`, mais aucun composant ne le lit : le rendu
    // retombe sur `showEmptyList` (TransactionList.tsx:44).
    memeEcranQuAucuneDonnee();
  });

  it("une coupure réseau produit exactement le même rendu qu'un 500", () => {
    stubPublicTransactionsInjoignable();

    cy.visit("/");

    // Pas de `cy.wait` sur cet alias : `forceNetworkError` fait qu'aucune
    // réponse n'arrive jamais, et `cy.wait` échouerait sur « no response ever
    // occurred ». L'assertion sur l'état est retriable, elle suffit.
    cy.appState("publicTransactions").should("eq", "failure");
    memeEcranQuAucuneDonnee();
  });

  it("une réponse 200 sans résultat se rend exactement comme une erreur 500", () => {
    const flux = stubPublicTransactions(reponseTransactions([]));

    cy.visit("/");
    cy.wait(flux);

    // Ici la machine est en SUCCÈS. Même écran que les deux tests ci-dessus,
    // état opposé : l'utilisateur ne peut pas savoir s'il n'a pas de
    // transaction ou si le service est tombé.
    //
    // `deep.equal` et non `eq` : `success` est un état IMBRIQUÉ, XState en rend
    // un objet. C'est ce test qui a révélé que `cy.appState` était typée
    // `string` à tort (corrigé en semaine 5, `support/types.ts`).
    //
    // La valeur est annotée `EtatDonnees`, type DÉRIVÉ de `DataSchema` : une
    // faute de frappe dans « withoutData » ne compile pas. Sans l'annotation,
    // ce serait une chaîne magique dans une assertion Chai, que rien ne relit.
    const succesSansDonnee: EtatDonnees = { success: "withoutData" };
    cy.appState("publicTransactions").should("deep.equal", succesSansDonnee);
    memeEcranQuAucuneDonnee();
  });
});
