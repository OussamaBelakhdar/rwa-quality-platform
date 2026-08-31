import { interceptPersonalTransactions } from "@support/intercepts/transactions.intercepts";

// Niveau E2E : l'attente sur alias réseau n'a de sens qu'avec un vrai backend
// et une vraie navigation.

describe("Fondations — attente déterministe", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed();
    cy.login("Heath93");
    cy.visit("/");
  });

  it("attend la réponse réseau, jamais une durée", () => {
    const personal = interceptPersonalTransactions();

    cy.getBySel("nav-personal-tab").click();

    // On attend un événement, pas un délai. Une durée fixe serait soit trop
    // courte en CI, soit du temps perdu à chaque exécution (P4).
    cy.wait(personal).its("response.statusCode").should("eq", 200);
    cy.getBySel("transaction-list").should("be.visible");
  });

  it("expose la requête interceptée pour assertion", () => {
    const personal = interceptPersonalTransactions();

    cy.getBySel("nav-personal-tab").click();

    cy.wait(personal).then((interception) => {
      expect(interception.request.method, "la méthode est un GET").to.equal("GET");
      expect(interception.response?.body, "la réponse porte des résultats").to.have.property(
        "results"
      );
    });
  });
});
