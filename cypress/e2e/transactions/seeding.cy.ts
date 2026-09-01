import { userBuilder } from "../../fixtures/builders/user.builder";

// Niveau E2E : la création de données par la couche L1 se vérifie en
// constatant qu'elle apparaît dans l'interface. Un test de contrat prouverait
// que l'endpoint répond ; seul l'E2E prouve que la donnée créée est celle que
// l'application rend.

describe(
  "Transactions — seeding par la couche L1",
  { tags: ["@transactions", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
    });

    it("rend visible une transaction créée sans passer par l'UI", () => {
      const payeur = userBuilder().build();
      const beneficiaire = userBuilder().build();

      cy.createUser(payeur).then((emetteur) => {
        cy.createUser(beneficiaire).then((destinataire) => {
          cy.createTransaction({
            senderId: emetteur.id,
            receiverId: destinataire.id,
            amount: 4242,
            description: "Transaction créée par la couche L1",
          });

          cy.login(payeur.username);
          cy.visit("/personal");
          cy.getBySelLike("transaction-item").should(
            "contain",
            "Transaction créée par la couche L1"
          );
        });
      });
    });
  }
);
