import {
  stubBankAccountsEnErreur,
  stubNotificationsEnErreur,
  stubTransactionDetailEnErreur,
} from "@support/intercepts/domaines.intercepts";

// Niveau E2E : même raison que `erreurs-serveur.cy.ts` — le chemin erreur
// réseau → `dataMachine` → rendu ne se traverse qu'ici.
//
// Ces trois surfaces partagent `dataMachine` avec le flux de transactions,
// donc partageaient son défaut : une requête en échec retombait sur l'écran
// « aucune donnée » — ou, pour le détail, sur une page BLANCHE. Un écran
// d'erreur commun (`ErrorState`) les couvre désormais toutes ; ces tests
// empêchent qu'une seule d'entre elles retombe en arrière.

/** Contrat d'erreur, identique partout : c'est tout l'intérêt d'un composant unique. */
const ecranDErreur = (message: string): void => {
  cy.getBySel("error-state").should("be.visible");
  cy.getBySel("error-state-message").should("have.text", message);
  cy.getBySel("error-state-retry").should("be.visible");
  cy.getBySel("empty-list-header").should("not.exist");
};

const ERREUR_500 = "Request failed with status code 500";

describe("Réseau — erreurs sur les autres surfaces", { tags: ["@network", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("une panne des notifications s'affiche au lieu de « No Notifications »", () => {
    const flux = stubNotificationsEnErreur(500);

    cy.visit("/notifications");
    cy.wait(flux);

    ecranDErreur(ERREUR_500);
  });

  it("une panne des comptes bancaires s'affiche au lieu de « No Bank Accounts »", () => {
    // Les comptes bancaires passent par GraphQL : le stub vise `POST /graphql`.
    const flux = stubBankAccountsEnErreur(500);

    cy.visit("/bankaccounts");
    cy.wait(flux);

    ecranDErreur(ERREUR_500);
  });

  it("une panne du détail d'une transaction s'affiche au lieu d'une page blanche", () => {
    // L'identifiant n'a pas besoin d'exister : la réponse est stubée. Ce que
    // le test fixe, c'est le rendu de l'échec, pas la résolution de l'id.
    const flux = stubTransactionDetailEnErreur(500);

    cy.visit("/transaction/peu-importe");
    cy.wait(flux);

    ecranDErreur(ERREUR_500);
  });
});
