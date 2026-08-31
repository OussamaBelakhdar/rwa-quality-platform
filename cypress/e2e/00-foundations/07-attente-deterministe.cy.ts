import { interceptTransactions } from "@support/intercepts/transactions.intercepts";

// Niveau E2E : l'attente sur alias réseau n'a de sens qu'avec un vrai backend
// et une vraie navigation.

describe("Fondations — attente déterministe", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("attend la réponse réseau, jamais une durée", () => {
    const transactions = interceptTransactions();

    cy.getBySel("nav-personal-tab").click();

    // On attend un événement, pas un délai. Une durée fixe serait soit trop
    // courte en CI, soit du temps perdu à chaque exécution (P4).
    cy.wait(transactions).its("response.statusCode").should("eq", 200);
    cy.getBySel("transaction-list").should("be.visible");
  });

  it("expose la réponse interceptée pour assertion", () => {
    const transactions = interceptTransactions();

    cy.getBySel("nav-personal-tab").click();

    // Rien sur la méthode : la factory n'intercepte que des GET, l'assertion
    // serait vraie par construction. On assert la réponse, que l'application
    // produit réellement.
    cy.wait(transactions).then((interception) => {
      expect(interception.response?.statusCode, "réponse servie").to.equal(200);
      expect(interception.response?.body, "la réponse porte des résultats").to.have.property(
        "results"
      );
    });
  });
});
