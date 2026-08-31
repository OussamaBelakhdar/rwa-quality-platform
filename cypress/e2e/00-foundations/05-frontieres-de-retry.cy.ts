// Niveau E2E : les frontières de retry ne s'observent que sur un DOM qui se
// peuple après un appel réseau.

describe("Fondations — frontières de retry", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed();
    cy.login("Heath93");
    cy.visit("/");
  });

  it("rejoue toute la suite de queries qui précède l'assertion", () => {
    // getBySel puis getBySelLike sont deux *queries*. L'assertion finale les
    // rejoue toutes les deux jusqu'au succès : c'est ce qui rend l'attente
    // implicite fiable, et cy.wait(<nombre>) inutile (P4).
    cy.getBySel("transaction-list")
      .getBySelLike("transaction-item")
      .should("have.length.greaterThan", 0);
  });

  it("arrête le retry dès qu'une commande d'action s'intercale", () => {
    // `.click()` est une action, pas une query : elle borne la zone rejouable.
    // Ce qui suit repart d'une nouvelle chaîne, donc d'un nouveau retry.
    cy.getBySel("nav-personal-tab").click();
    cy.getBySel("transaction-list").should("be.visible");
  });

  it("fige la valeur dès qu'on sort de la chaîne", () => {
    cy.getBySelLike("transaction-item").then(($items) => {
      const frozen = $items.length;
      // `frozen` ne sera jamais réévalué : aucune assertion portant dessus
      // ne bénéficie du retry. C'est le piège que .should(callback) évite.
      expect(frozen).to.be.greaterThan(0);
    });
  });
});
