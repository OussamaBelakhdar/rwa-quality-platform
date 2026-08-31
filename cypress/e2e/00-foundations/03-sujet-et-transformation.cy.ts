// Niveau E2E : la transformation du sujet et l'ordre d'insertion dans la file
// ne s'observent que sur une chaîne réelle.

describe(
  "Fondations — le sujet et sa transformation",
  { tags: ["@foundations", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
      cy.visit("/");
    });

    it("remplace le sujet quand .then retourne une valeur", () => {
      // Le sujet n'est plus un élément mais la chaîne retournée — d'où le
      // `contain`, qui serait une erreur de type sur un JQuery.
      cy.getBySel("sidenav-username")
        .then(($el) => $el.text().trim())
        .should("contain", "Heath93");
    });

    it("conserve le sujet quand .then ne retourne rien", () => {
      cy.getBySel("sidenav-username")
        .then(($el) => {
          // Pas de `return` : le sujet reste l'élément d'origine, donc
          // `be.visible` ci-dessous s'applique encore.
          expect($el).to.have.length(1);
        })
        .should("be.visible");
    });

    it("empile les commandes imbriquées avant la suite de la chaîne", () => {
      const ordre: string[] = [];

      cy.getBySel("sidenav-username").then(() => {
        ordre.push("then-externe");
        // Cette commande n'est pas exécutée ici : elle est *insérée* dans la
        // file, juste après la commande courante. D'où l'ordre observé.
        cy.getBySel("sidenav-user-balance").then(() => ordre.push("then-interne"));
      });

      cy.then(() => {
        expect(ordre, "l'imbriquée passe avant la suite de la chaîne").to.deep.equal([
          "then-externe",
          "then-interne",
        ]);
      });

      // Corollaire : une chaîne Cypress n'est pas une Promise. `await cy.get()`
      // ne fait pas ce qu'on croit, et ESLint interdit même d'en stocker le
      // retour (cypress/no-assigning-return-values).
    });
  }
);
