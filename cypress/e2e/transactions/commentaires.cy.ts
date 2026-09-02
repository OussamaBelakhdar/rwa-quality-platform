import { userBuilder } from "@fixtures/builders/user.builder";
import { interceptComment } from "@support/intercepts/social.intercepts";
import type { Transaction } from "../../../src/models";

// Niveau E2E : poster un commentaire traverse le formulaire, la machine de
// détail, l'API et le re-rendu de la liste. Un test de composant recevrait la
// liste en props ; `cy.request` prouverait la route sans jamais rendre.

/**
 * Crée une transaction entre deux utilisateurs neufs et rend la transaction.
 *
 * Local au fichier et non descendu en L2 : c'est un arrangement de données
 * propre à ces specs, pas une capacité que d'autres domaines réclameront.
 */
const transactionNeuve = (au: (t: Transaction, payeur: string) => void): void => {
  const payeur = userBuilder().build();
  const beneficiaire = userBuilder().build();
  let emetteur = "";
  cy.createUser(payeur).then((u) => (emetteur = u.id));
  cy.createUser(beneficiaire).then((destinataire) => {
    cy.createTransaction({
      senderId: emetteur,
      receiverId: destinataire.id,
      amount: 42,
      description: "Transaction commentée",
    }).then((t) => au(t, payeur.username));
  });
};

describe("Transactions — commentaires", { tags: ["@transactions", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
  });

  it("affiche les deux commentaires postés, quel que soit l'ordre renvoyé", () => {
    transactionNeuve((transaction, auteur) => {
      cy.login(auteur);
      cy.visit(`/transaction/${transaction.id}`);
      const commentaire = interceptComment();

      cy.getBySelWithId("transaction-comment-input", transaction.id).type("premier{enter}");
      cy.wait(commentaire);
      cy.getBySelWithId("transaction-comment-input", transaction.id).type("second{enter}");
      cy.wait(commentaire);

      // Assertion de PRÉSENCE, jamais de position. `backend/database.ts` trie
      // les commentaires au hasard sur la branche `flake-demo` — et c'est un
      // comportement légitime : rien dans l'API ne promet un ordre. Un test qui
      // asserte `.eq(0)` invente une garantie que le contrat ne donne pas.
      cy.getBySel("comments-list").should("contain", "premier").and("contain", "second");
    });
  });
});
