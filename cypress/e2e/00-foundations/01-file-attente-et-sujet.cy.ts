// Niveau E2E : la mécanique du runner ne s'observe que sur l'application réelle.
//
// Ces 8 specs sont taguées @regression et bloquent donc le merge (gate §6).
// C'est assumé : elles ne protègent pas un comportement métier, elles protègent
// la couche L2 (cy.seed, cy.login, cy.getBySel, factories d'intercept). Si une
// montée de Cypress ou une régression de L2 les casse, le merge DOIT bloquer.

describe("Fondations — file d'attente et sujet", { tags: ["@foundations", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
  });

  it("n'exécute aucune commande au moment où on l'écrit", () => {
    let executed = false;

    cy.getBySel("transaction-list").then(() => {
      executed = true;
    });

    // Cette ligne s'exécute pendant la *collecte*, avant que la file ne
    // démarre. C'est la raison n°1 pour laquelle un `if (…)` autour d'un
    // cy.* ne marche pas.
    expect(executed, "au moment de la collecte, la file n'a pas encore tourné").to.be.false;

    cy.then(() => {
      expect(executed, "une fois la file déroulée, le .then a bien eu lieu").to.be.true;
    });
  });

  it("détache le sujet capturé quand la liste est remontée", () => {
    cy.getBySel("transaction-list").then(($list) => {
      expect(Cypress.dom.isDetached($list), "à la capture, l'élément est attaché").to.be.false;

      // Les onglets sont des <Tab component={Link} to="…"> : changer d'onglet
      // est un changement de route React Router, qui démonte
      // TransactionPublicList et monte TransactionPersonalList.
      cy.getBySel("nav-personal-tab").click();

      cy.getBySel("transaction-list").should(($fresh) => {
        // Le noeud capturé n'est plus dans le document. C'est l'origine de
        // « element is detached from the DOM » : garder une référence au
        // lieu de relire la chaîne.
        expect(Cypress.dom.isDetached($list), "le sujet capturé est détaché").to.be.true;
        expect(Cypress.dom.isDetached($fresh), "le sujet relu est attaché").to.be.false;
      });
    });
  });
});
