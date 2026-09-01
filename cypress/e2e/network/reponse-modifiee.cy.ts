import { mutateCheckAuth } from "@support/intercepts/auth.intercepts";
import { mutatePublicTransactions } from "@support/intercepts/transactions.intercepts";
import { sendToService } from "@support/app-actions/xstate.actions";
import { premiereDe } from "@fixtures/builders/transaction.builder";
import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";

// Niveau E2E : on exerce le rendu d'une valeur que le backend ne produit
// jamais, sur une réponse par ailleurs réelle. L'écrire en base la laisserait
// derrière soi ; un stub complet perdrait le reste de la vraie réponse.

describe("Réseau — réponse modifiée à la volée", { tags: ["@network", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("un montant hors norme est rendu en entier, sans troncature", () => {
    const flux = mutatePublicTransactions((corps) => {
      const premiere = corps.results[0];
      if (premiere) {
        // Le backend stocke en centimes : 123 456 789 se rend « $1,234,567.89 ».
        premiere.amount = 123456789;
      }
    });

    cy.visit("/");

    cy.wait(flux).then(({ response }) => {
      const { id } = premiereDe(response?.body as ReponseTransactions);
      cy.getBySelWithId("transaction-amount", id).should("contain", "$1,234,567.89");
    });
  });

  it("un montant négatif se rend avec un double signe", () => {
    const flux = mutatePublicTransactions((corps) => {
      const premiere = corps.results[0];
      if (premiere) {
        premiere.amount = -500;
      }
    });

    cy.visit("/");

    cy.wait(flux).then(({ response }) => {
      // DÉFAUT DE L'APPLICATION. `TransactionAmount.tsx:45` préfixe « - » pour
      // tout paiement, et `formatAmount` en produit un second pour un montant
      // négatif. Le backend ne renvoyant jamais de négatif, le cas n'existait
      // pour personne — c'est précisément ce qu'un stub réseau va chercher.
      const { id } = premiereDe(response?.body as ReponseTransactions);
      cy.getBySelWithId("transaction-amount", id).should("contain", "--$5.00");
    });
  });
  it("un solde négatif est affiché tel quel, sans traitement particulier", () => {
    const flux = mutateCheckAuth((corps) => {
      // Le backend ne descend jamais un solde sous zéro : il refuse le
      // paiement avant. Le rendu de ce cas n'avait donc jamais été exercé.
      corps.user.balance = -12345;
    });

    cy.visit("/");
    // `/checkAuth` n'est appelé que par l'état `refreshing` d'`authMachine` :
    // sans cet événement, l'intercept n'attraperait rien.
    sendToService("auth", "REFRESH");

    cy.wait(flux);
    cy.getBySel("sidenav-user-balance").should("have.text", "-$123.45");
  });
});
