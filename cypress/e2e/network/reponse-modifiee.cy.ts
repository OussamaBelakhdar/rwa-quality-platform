import { premiereDe } from "@fixtures/builders/transaction.builder";
import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";
import { sendToService } from "@support/app-actions/xstate.actions";
import { mutateCheckAuth } from "@support/intercepts/auth.intercepts";
import { mutatePublicTransactions } from "@support/intercepts/transactions.intercepts";

// Niveau E2E : on exerce le rendu d'une valeur que le backend ne produit pas,
// sur une réponse par ailleurs réelle. L'écrire en base la laisserait derrière
// soi ; un stub complet perdrait le reste de la vraie réponse.

/**
 * Force la première transaction de la réponse à être un PAIEMENT, puis lui
 * donne le montant voulu.
 *
 * `requestStatus` vidé : `isRequestTransaction` (`transactionUtils.ts:38`) en
 * déduit un paiement, donc un signe « - ». Sans cette normalisation, le signe
 * attendu dépendrait de la transaction que la graine place en tête — le test
 * passerait aujourd'hui et casserait au premier changement de graine.
 */
const paiementDe = (centimes: number) => (corps: ReponseTransactions) => {
  const premiere = corps.results[0];
  if (premiere) {
    premiere.requestStatus = undefined;
    premiere.amount = centimes;
  }
};

describe("Réseau — réponse modifiée à la volée", { tags: ["@network", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("un montant hors norme est rendu en entier, sans troncature", () => {
    // Le backend stocke en centimes : 123 456 789 se rend « $1,234,567.89 ».
    const flux = mutatePublicTransactions(paiementDe(123456789));

    cy.visit("/");

    cy.wait(flux).then(({ response }) => {
      const { id } = premiereDe(response?.body as ReponseTransactions);
      // `have.text` et non `contain` : le signe fait partie du rendu, et
      // `contain` laisserait passer un préfixe inattendu — c'est précisément
      // ce que le test suivant a démontré avant correction.
      cy.getBySelWithId("transaction-amount", id).should("have.text", "-$1,234,567.89");
    });
  });

  it("un montant négatif ne produit qu'un seul signe", () => {
    const flux = mutatePublicTransactions(paiementDe(-500));

    cy.visit("/");

    cy.wait(flux).then(({ response }) => {
      const { id } = premiereDe(response?.body as ReponseTransactions);
      // RÉGRESSION. Avant correctif la ligne affichait « --$5.00 » :
      // `TransactionAmount.tsx` préfixait « - » pour tout paiement, et
      // `formatAmount` en produisait un second. Le signe rendu est le SENS de
      // la transaction, pas celui du nombre — le montant est donc affiché en
      // valeur absolue. `backend/validators.ts:87` ne valide `amount` qu'avec
      // `isNumeric()` : rien n'interdit un négatif côté API.
      cy.getBySelWithId("transaction-amount", id).should("have.text", "-$5.00");
    });
  });

  it("un montant nul est rendu comme un montant, pas comme un zéro nu", () => {
    const flux = mutatePublicTransactions(paiementDe(0));

    cy.visit("/");

    cy.wait(flux).then(({ response }) => {
      const { id } = premiereDe(response?.body as ReponseTransactions);
      // RÉGRESSION. `{transaction.amount && formatAmount(...)}` rendait le
      // nombre `0` sur un montant nul — React l'affichait tel quel, « -0 ».
      // La garde ne protégeait rien : `amount` est requis par le modèle.
      cy.getBySelWithId("transaction-amount", id).should("have.text", "-$0.00");
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
