// Niveau E2E : cy.press dispatche un vrai événement clavier au navigateur.
// Ni un composant monté ni cy.request ne peuvent l'exercer.
//
// Ces tests dépendent de l'ordre de tabulation du DOM. Celui-ci est stable ici
// parce que Heath93 possède un compte bancaire dans le seed : le dialogue
// `user-onboarding-dialog` ne s'ouvre donc pas et ne capture pas le focus.
// Un futur cy.seed('empty') casserait ce fichier — c'est écrit ici pour que la
// cause soit trouvable en trente secondes plutôt qu'en une demi-journée.

describe(
  "Fondations — clavier natif avec cy.press",
  { tags: ["@foundations", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
      cy.login("Heath93");
      cy.visit("/");
    });

    it("déplace le focus d'un élément à l'autre", () => {
      // Stabiliser l'état AVANT de tabuler : un re-rendu de la liste entre les
      // deux pressions déplacerait le focus et rendrait la comparaison fausse
      // pour la mauvaise raison.
      cy.getBySel("transaction-list").should("be.visible");

      cy.press(Cypress.Keyboard.Keys.TAB);
      // Comparaison sur le HTML rendu, pas sur l'identité du noeud : un noeud
      // remonté entre les deux mesures ferait passer le test à tort.
      cy.focused()
        .invoke("prop", "outerHTML")
        .then((premier: string) => {
          cy.press(Cypress.Keyboard.Keys.TAB);
          cy.focused()
            .invoke("prop", "outerHTML")
            .should((second: string) => {
              expect(second, "le focus a changé d'élément").to.not.equal(premier);
            });
        });
    });

    it("atteint un élément réellement focusable", () => {
      cy.getBySel("transaction-list").should("be.visible");
      cy.press(Cypress.Keyboard.Keys.TAB);
      // `cy.focused()` échoue de lui-même si activeElement est le body : on
      // assert donc ce qui est réellement discriminant, la nature de l'élément.
      cy.focused().should("match", "a, button, input, select, textarea, [tabindex]");
    });

    // Note : `Cypress.stop()` (et non cy.stop) interrompt le runner. Outil de
    // mise au point en mode interactif ; l'appeler dans une suite automatisée
    // arrêterait l'exécution, donc il est documenté, pas appelé.
  }
);
