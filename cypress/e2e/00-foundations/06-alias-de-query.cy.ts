// Niveau E2E : le comportement d'un alias de query dépend du DOM vivant.

describe("Fondations — alias de query", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed();
    cy.login("Heath93");
    cy.visit("/");
  });

  it("réexécute la query aliasée au lieu de servir un cache", () => {
    cy.getBySel("transaction-list").as("liste");

    // Changer d'onglet remonte la liste : l'ancien noeud est détaché.
    cy.getBySel("nav-personal-tab").click();

    // L'alias ne rend pas le noeud capturé, il rejoue la query.
    cy.get("@liste").should(($list) => {
      expect(Cypress.dom.isDetached($list), "l'alias rend un noeud attaché").to.be.false;
    });
  });

  it("aliase aussi une valeur primitive, qui elle ne se rejoue pas", () => {
    cy.getBySel("sidenav-username")
      .then(($el) => $el.text().trim())
      .as("nom");

    cy.getBySel("nav-personal-tab").click();

    // Un alias de valeur est un instantané : rien à rejouer, donc rien à
    // rafraîchir. Le distinguer d'un alias de query évite des surprises.
    cy.get("@nom").should("contain", "Heath93");
  });
});
