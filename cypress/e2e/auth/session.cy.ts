// Niveau E2E : le contrat de `cy.session` ne s'observe qu'avec un vrai serveur
// capable d'invalider une session. Ni un composant ni un test de contrat ne
// peuvent exercer le cycle cache → validate → re-setup.

describe("Auth — cache de session", { tags: ["@auth", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
  });

  it("recrée la session quand le serveur l'a invalidée", () => {
    cy.login("Heath93");

    // Détruit la session côté serveur (`backend/auth.ts:49` : clearCookie +
    // session.destroy). Le cookie que `cy.session` a mis en cache devient
    // périmé, alors que le cache, lui, est toujours là.
    cy.request({
      method: "POST",
      url: `${Cypress.expose("apiUrl")}/logout`,
      failOnStatusCode: false,
      log: false,
    });

    // Sans `validate()`, Cypress restaurerait le cache périmé. L'interface
    // *paraîtrait* connectée : `cy.session` restaure aussi `localStorage`, et
    // la machine se fie à son état persisté. Vérifier le nom d'utilisateur ne
    // prouverait donc rien — il vient du cache, pas du serveur.
    //
    // L'assertion doit porter sur une donnée qui exige une session serveur
    // valide : la liste publique est une route authentifiée
    // (`backend/transaction-routes.ts:93`). Avec un cookie périmé elle
    // répond 401 et la liste reste vide.
    cy.login("Heath93");

    cy.visit("/");
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
  });

  it("sert la session en cache sans repasser par le formulaire", () => {
    cy.login("Heath93");
    cy.visit("/");

    // Preuve que la restauration suffit : on n'est jamais passé par /signin
    // dans ce test, et l'application est authentifiée.
    cy.location("pathname").should("eq", "/");
    cy.getBySel("sidenav-username").should("contain", "Heath93");
  });
});
