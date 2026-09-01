import { mutatePublicTransactions } from "@support/intercepts/transactions.intercepts";
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
});
