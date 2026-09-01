import {
  premiereDe,
  reponseTransactions,
  transactionBuilder,
} from "@fixtures/builders/transaction.builder";
import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";
import {
  interceptPublicTransactions,
  stubPublicTransactions,
} from "@support/intercepts/transactions.intercepts";

// Niveau E2E : la différence entre espion et stub n'existe qu'à l'exécution,
// sur une vraie pile réseau. Un test de composant reçoit ses données en props
// et ne joint jamais de backend ; `cy.request` joint le backend mais ne rend
// rien. Seul l'E2E peut montrer que l'un passe et que l'autre coupe.

describe(
  "Réseau — espion et stub sur le flux public",
  { tags: ["@network", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
    });

    it("le flux public affiche les transactions que le backend a réellement renvoyées", () => {
      const flux = interceptPublicTransactions();

      cy.visit("/");

      cy.wait(flux).then(({ response }) => {
        expect(response?.statusCode, "le backend a répondu lui-même").to.eq(200);
        const premiere = premiereDe(response?.body as ReponseTransactions);
        // Assertion de CONTENU, pas d'existence : elle relie la ligne rendue à
        // cette réponse-là. Un `should('exist')` ne dirait rien de plus que le
        // `getBySelWithId` qui le précède, qui échoue déjà seul.
        cy.getBySelWithId("transaction-item", premiere.id).should("contain", premiere.description);
      });
    });

    it("le flux public affiche les données du stub, et aucune de celles du backend", () => {
      const inventee = transactionBuilder().withDescription("Jamais vue en base").build();
      const flux = stubPublicTransactions(reponseTransactions([inventee]));

      cy.visit("/");
      cy.wait(flux);

      // Une seule ligne : les transactions réellement seedées ne sont pas là.
      // C'est la preuve de la coupure, que l'assertion de contenu seule ne
      // donnerait pas.
      cy.getBySelLike("transaction-item").should("have.length", 1);
      cy.getBySelWithId("transaction-item", inventee.id).should("contain", "Jamais vue en base");
    });
  }
);
