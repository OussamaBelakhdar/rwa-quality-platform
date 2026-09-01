// Niveau E2E : les frontières de retry ne s'observent que sur un DOM qui se
// peuple après un appel réseau.

describe("Fondations — frontières de retry", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("passe sans attente explicite parce que l'assertion rejoue la query", () => {
    // Le clic déclenche un GET ; la liste est vide à l'instant qui suit.
    // Aucun cy.wait ici : c'est le retry de l'assertion qui fait le travail.
    // Avec `{ timeout: 0 }`, cette même ligne échouerait.
    //
    // L'assertion porte sur le CONTENU et non sur un simple compte : la liste
    // personnelle ne doit contenir que des transactions impliquant
    // l'utilisateur connecté. Une assertion de longueur passerait aussi sur la
    // liste publique restée à l'écran — elle ne prouverait donc pas que le
    // rafraîchissement a eu lieu.
    cy.getBySel("nav-personal-tab").click();

    cy.getBySelLike("transaction-item").should(($lignes) => {
      expect($lignes.length, "la liste personnelle est peuplée").to.be.greaterThan(0);
      const etrangeres = $lignes.toArray().filter((l) => !(l.textContent ?? "").includes("Ted P"));
      expect(etrangeres, "chaque ligne implique l'utilisateur connecté").to.have.length(0);
    });
  });

  it("fige la valeur sortie de la chaîne, pendant que la chaîne reste vivante", () => {
    cy.getBySel("transaction-list").then(($capture) => {
      const noeudCapture = $capture[0];

      cy.getBySel("nav-personal-tab").click();

      cy.getBySel("transaction-list").should(($frais) => {
        // La variable pointe toujours sur l'ancien noeud, démonté par le
        // changement de route. La chaîne, elle, a relu le DOM courant.
        // Si Cypress rafraîchissait les valeurs capturées, cette assertion
        // échouerait — c'est ce qui la rend probante.
        expect($frais[0], "la chaîne rend un noeud différent").to.not.equal(noeudCapture);
        expect(Cypress.dom.isDetached($frais), "et ce noeud est attaché").to.be.false;
      });
    });
  });
});
