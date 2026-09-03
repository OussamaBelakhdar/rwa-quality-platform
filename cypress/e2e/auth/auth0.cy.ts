// Niveau E2E : le flux Auth0 traverse DEUX origines — l'application et le
// domaine du tenant — puis revient par un échange de `code`. Ni un test de
// composant ni `cy.request` ne peuvent l'exercer : le premier n'a pas de
// navigateur, le second ne suit pas la redirection et ne déclenche donc jamais
// `onRedirectCallback` (ADR-004 et ADR-009).

describe("Auth — connexion via Auth0", { tags: ["@auth", "@smoke"] }, function () {
  beforeEach(function () {
    // Sans tenant configuré, la spec est mise EN ATTENTE et non en échec :
    // `auth0_configured` est calculé dans `cypress.config.ts` à partir des cinq
    // variables requises. Un `describe.skip` littéral serait bloqué par le hook
    // — et à raison : il désactiverait la spec pour tout le monde, alors que la
    // condition est propre à l'environnement.
    if (!Cypress.expose("auth0_configured")) this.skip();
    cy.seed("default");
    cy.loginAuth0();
  });

  it("mène l'utilisateur authentifié à son tableau de bord", function () {
    // Ce que cette assertion prouve et que le login programmatique ne
    // prouverait pas : le retour de redirection a été traité. Une URL restée
    // sur `?code=…&state=…` signalerait un `onRedirectCallback` non câblé.
    cy.visit("/");
    cy.location("pathname").should("eq", "/");
    cy.location("search").should("not.contain", "code=");
    cy.getBySel("sidenav-username").should("be.visible");
  });

  it("réutilise la session sans repasser par le formulaire d'Auth0", function () {
    // `cy.session` a mis la session en cache au premier `it`. Si le cache
    // n'était pas honoré, le second passage repartirait sur le domaine du
    // tenant — l'origine resterait celle d'Auth0, pas celle de l'application.
    cy.visit("/personal");
    cy.location("origin").should("eq", Cypress.config("baseUrl"));
    cy.getBySel("sidenav-username").should("be.visible");
  });
});
