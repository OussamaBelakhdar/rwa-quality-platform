// Niveau E2E : la retry-ability se démontre sur un DOM qui se peuple après un
// appel réseau. Un composant monté avec des props figées ne la montre pas.

describe("Fondations — retry-ability", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("réessaie la query jusqu'à ce que l'assertion passe", () => {
    // Aucune attente explicite : `should` relance `getBySelLike` jusqu'au
    // succès ou jusqu'au timeout. C'est ce qui rend cy.wait(<nombre>) inutile.
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
  });

  it("vérifie plusieurs conditions dans un seul should à retry", () => {
    // Un should(callback) rejoue le callback *entier* à chaque tentative.
    // Deux assertions séparées ne garantiraient pas de les voir vraies ensemble.
    // Le signe est admis : un solde négatif est un état valide de l'application,
    // l'assertion porte sur le format, pas sur la solvabilité de l'utilisateur.
    cy.getBySel("sidenav-user-balance").should(($balance) => {
      const text = $balance.text();
      expect(text, "le solde est rendu").to.not.be.empty;
      expect(text, "le solde est formaté en dollars").to.match(/^-?\$[\d,]+\.\d{2}$/);
    });
  });
});
