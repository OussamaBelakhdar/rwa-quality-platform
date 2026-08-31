// Niveau E2E : cy.press dispatche un vrai événement clavier au navigateur.
// Ni un composant monté ni cy.request ne peuvent l'exercer.

describe(
  "Fondations — clavier natif avec cy.press",
  { tags: ["@foundations", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed();
      cy.login("Heath93");
      cy.visit("/");
    });

    it("déplace le focus d'un élément à l'autre", () => {
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().then(($first) => {
        cy.press(Cypress.Keyboard.Keys.TAB);
        cy.focused().should(($second) => {
          expect($second[0], "le focus a changé d'élément").to.not.equal($first[0]);
        });
      });
    });

    it("atteint un élément interactif au clavier seul", () => {
      // Preuve d'accessibilité au passage : la navigation clavier aboutit sur un
      // élément réellement focusable, pas sur le body.
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().should("not.match", "body").and("be.visible");
    });

    // Note : `Cypress.stop()` (et non cy.stop) interrompt le runner. C'est un
    // outil de mise au point en mode interactif ; l'appeler dans une suite
    // automatisée arrêterait l'exécution, donc il est documenté, pas appelé.
  }
);
