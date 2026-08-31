import { fetchPublicTransactions } from "@support/app-actions/xstate.actions";
import { interceptPublicTransactions } from "@support/intercepts/transactions.intercepts";

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

    // Exécuté pendant la *collecte*, avant que la file ne démarre. C'est la
    // raison n°1 pour laquelle un `if (…)` autour d'un cy.* ne marche pas.
    expect(executed, "à la collecte, la file n'a pas encore tourné").to.be.false;

    cy.then(() => {
      expect(executed, "une fois la file déroulée, le .then a eu lieu").to.be.true;
    });
  });

  // ── Sujet capturé trop tôt : la version qui casse, puis la version juste ──
  // Le premier test échoue réellement ; `cy.on("fail")` intercepte l'échec et
  // assert dessus. La démonstration est donc exécutée à chaque run, au lieu
  // d'être un commentaire que personne ne vérifie.

  it("CASSÉ — lit la variable hors de la chaîne, donc avant qu'elle soit remplie", function (done) {
    let nombre: number | undefined;

    cy.on("fail", (err) => {
      expect(err.message, "l'échec est bien celui attendu").to.contain("undefined");
      done();
      return false;
    });

    cy.getBySelLike("transaction-item").then(($items) => {
      nombre = $items.length;
    });

    expect(nombre).to.be.greaterThan(0);
  });

  it("CORRIGÉ — lit la variable dans la chaîne, une fois la file déroulée", () => {
    let nombre: number | undefined;

    cy.getBySelLike("transaction-item").then(($items) => {
      nombre = $items.length;
    });

    cy.then(() => {
      expect(nombre, "la file a tourné, la variable est remplie").to.be.greaterThan(0);
    });
  });

  it("détache le sujet capturé quand XState re-rend la liste", () => {
    const publiques = interceptPublicTransactions();

    cy.getBySelLike("transaction-item")
      .first()
      .then(($ligne) => {
        expect(Cypress.dom.isDetached($ligne), "à la capture, la ligne est attachée").to.be.false;

        // Re-render par la machine, sans changement de route : le composant
        // reste monté. Le filtre est nécessaire — un FETCH qui rend les
        // mêmes données laisse React réutiliser les noeuds.
        fetchPublicTransactions({ amountMin: 1, amountMax: 2 });
        cy.wait(publiques);

        cy.getBySel("empty-list-header")
          .should("be.visible")
          .then(() => {
            expect(Cypress.dom.isDetached($ligne), "la ligne capturée est détachée").to.be.true;
          });
      });
  });
});
