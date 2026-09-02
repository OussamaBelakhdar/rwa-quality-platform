import { userBuilder } from "@fixtures/builders/user.builder";
import { interceptLike } from "@support/intercepts/social.intercepts";
import type { Transaction } from "../../../src/models";

// Niveau E2E : le like part de l'UI, traverse la machine de détail et l'API,
// puis le compteur se re-rend. C'est l'intégration qui est en jeu, pas le
// contrat de la route — celui-ci se prouverait en `cy.request`.

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
      description: "Transaction likée",
    }).then((t) => au(t, payeur.username));
  });
};

describe("Transactions — likes", { tags: ["@transactions", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
  });

  it("incrémente le compteur, quelle que soit la lenteur du serveur", () => {
    transactionNeuve((transaction, auteur) => {
      cy.login(auteur);
      cy.visit(`/transaction/${transaction.id}`);
      const like = interceptLike();

      cy.getBySelWithId("transaction-like-button", transaction.id).click();

      // `timeout` sur l'ATTENTE D'UN ÉVÉNEMENT, pas une durée d'attente fixe :
      // on attend la réponse, pas 10 secondes. La borne est justifiée par le
      // comportement du serveur — `backend/like-routes.ts` retarde la réponse
      // jusqu'à 5,5 s sur `flake-demo`, au-delà du `defaultCommandTimeout` de
      // 4 s. C'est une latence légitime que le test doit absorber, pas un
      // défaut : `cy.wait(5500)` serait la mauvaise réponse à la même question.
      cy.wait(like, { timeout: 10000 }).its("response.statusCode").should("eq", 200);

      // Texte NORMALISÉ : l'élément rend « 1 » avec une espace de fin.
      // `have.text` brut échouait sur `'1 '` contre `'1'` — mon assertion était
      // trop stricte, pas l'application instable. `contain` aurait masqué la
      // différence entre 1 et 11 ; `invoke("trim")` garde l'égalité exacte tout
      // en restant une query, donc rejouée jusqu'à ce que le compteur monte.
      cy.getBySelWithId("transaction-like-count", transaction.id)
        .invoke("text")
        .invoke("trim")
        .should("eq", "1");
    });
  });
});
