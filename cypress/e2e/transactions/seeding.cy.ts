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

    it("rend visible une transaction créée, avec le bon montant et le bon sens", () => {
      const payeur = userBuilder().build();
      const beneficiaire = userBuilder().build();

      // Deux variables de fermeture assignées à plat plutôt que deux `.then`
      // imbriqués : Cypress met les commandes en file, l'imbrication n'apporte
      // que des niveaux d'indentation (règle #5).
      let emetteurId = "";
      let destinataireId = "";

      cy.createUser(payeur).then((u) => (emetteurId = u.id));
      cy.createUser(beneficiaire).then((u) => (destinataireId = u.id));

      cy.then(() => {
        cy.createTransaction({
          senderId: emetteurId,
          receiverId: destinataireId,
          amount: 42,
          description: "Virement de contrôle",
        }).then((transaction) => {
          cy.login(payeur.username);
          cy.visit("/personal");

          // Assertion sur l'IDENTITÉ de la transaction créée, pas sur une
          // chaîne de description qu'une autre transaction pourrait porter.
          cy.getBySelWithId("transaction-item", transaction.id).should(($ligne) => {
            const texte = $ligne.text();
            // Le backend stocke en centimes : 42 envoyés deviennent 4200.
            // Ne pas l'asserter laissait passer un facteur 100.
            expect(texte, "le montant est celui demandé").to.contain("42.00");
            expect(texte, "le sens est un paiement du payeur").to.contain(payeur.firstName);
          });
        });
      });
    });
  }
);
