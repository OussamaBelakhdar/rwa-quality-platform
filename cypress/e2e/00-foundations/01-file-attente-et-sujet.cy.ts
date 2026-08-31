// Niveau E2E : le sujet de la démonstration est la mécanique du runner sur
// l'application réelle. Ni un composant ni cy.request ne peuvent l'exposer.

describe("Fondations — file d'attente et sujet", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed();
    cy.login("Heath93");
    cy.visit("/");
  });

  it("n'exécute aucune commande au moment où on l'écrit", () => {
    let executed = false;

    cy.getBySel("transaction-list").then(() => {
      executed = true;
    });

    // Cette ligne s'exécute pendant la *collecte*, avant que la file ne démarre.
    // C'est la raison n°1 pour laquelle un `if (…)` autour d'un cy.* ne marche pas.
    expect(executed, "au moment de la collecte, la file n'a pas encore tourné").to.be.false;

    cy.then(() => {
      expect(executed, "une fois la file déroulée, le .then a bien eu lieu").to.be.true;
    });
  });

  it("détache le sujet capturé quand XState re-rend la liste", () => {
    let captured: JQuery<HTMLElement> | undefined;

    cy.getBySel("transaction-list").then(($list) => {
      captured = $list;
      expect(Cypress.dom.isDetached($list), "au moment de la capture, l'élément est attaché").to.be
        .false;
    });

    // Changer d'onglet fait transiter la machine XState : React remonte la liste.
    cy.getBySel("nav-personal-tab").click();

    cy.getBySel("transaction-list").should(($fresh) => {
      // L'élément capturé pointe sur un noeud qui n'est plus dans le document.
      // C'est l'origine de « element is detached from the DOM » : garder une
      // référence au lieu de relire la chaîne.
      expect(Cypress.dom.isDetached(captured!), "le sujet capturé est détaché").to.be.true;
      expect(Cypress.dom.isDetached($fresh), "le sujet relu est attaché").to.be.false;
    });
  });
});
