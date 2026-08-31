// Niveau E2E : le comportement d'un alias dépend de ce qu'on aliase — une
// query ou une valeur. La différence n'apparaît que sur un DOM qui change.

describe("Fondations — alias de query", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("réexécute la query aliasée au lieu de servir un cache", () => {
    cy.getBySel("transaction-list").as("liste");

    // Changement de route : l'ancien noeud est démonté.
    cy.getBySel("nav-personal-tab").click();

    cy.get("@liste").should(($list) => {
      // Si l'alias servait un cache, ce noeud serait détaché.
      expect(Cypress.dom.isDetached($list), "l'alias rend un noeud attaché").to.be.false;
    });
  });

  it("sert un instantané quand on aliase une valeur, pas une query", () => {
    // On aliase le *noeud lui-même*, sorti de la chaîne — donc une valeur.
    cy.getBySel("transaction-list")
      .then(($el) => $el[0])
      .as("noeud");

    cy.getBySel("nav-personal-tab").click();

    cy.get("@noeud").should((noeud: unknown) => {
      // L'alias de valeur n'a rien à rejouer : il rend l'ancien noeud, détaché.
      // C'est l'exact contraire du test précédent, sur la même navigation :
      // c'est cette opposition qui prouve la distinction.
      expect(Cypress.dom.isDetached(Cypress.$(noeud as HTMLElement)), "instantané détaché").to.be
        .true;
    });
  });
});
