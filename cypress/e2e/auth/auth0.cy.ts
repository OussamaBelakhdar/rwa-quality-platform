// Niveau E2E : le flux Auth0 traverse DEUX origines — l'application et le
// domaine du tenant — puis revient par un échange de `code`. Ni un test de
// composant ni `cy.request` ne peuvent l'exercer : le premier n'a pas de
// navigateur, le second ne suit pas la redirection et ne déclenche donc jamais
// `onRedirectCallback` (ADR-004 et ADR-009).

/**
 * Deux régimes, et c'est la distinction qui compte.
 *
 * Dans la suite générale, Auth0 n'est pas le sujet : sans configuration, la
 * spec est mise EN ATTENTE. Un `describe.skip` littéral serait bloqué par le
 * hook — à raison, il désactiverait la spec pour tout le monde alors que la
 * condition est propre à l'environnement.
 *
 * Dans un run qui EXIGE Auth0 — le job CI dédié — se taire serait pire que
 * tout : le job passerait au vert sans rien tester. Une variable mal
 * orthographiée dans le workflow suffirait. Le drapeau `auth0_required`
 * transforme alors l'attente en ÉCHEC, et l'échec nomme les variables
 * absentes. C'est la même leçon que le hook `check-spec.sh` de la semaine 6,
 * qui sortait 0 quand `jq` manquait : un garde-fou doit échouer FERMÉ.
 */
function exigerOuIgnorer(contexte: Mocha.Context): void {
  if (Cypress.expose("auth0_configured")) return;
  if (!Cypress.expose("auth0_required")) {
    contexte.skip();
    return;
  }
  const manquantes = Cypress.expose("auth0_manquantes");
  throw new Error(
    `Auth0 est exigé par ce run (AUTH0_REQUIRED) mais n'est pas configuré. ` +
      `Variable(s) absente(s) : ${Array.isArray(manquantes) ? manquantes.join(", ") : "inconnues"}. ` +
      `Sans ce garde-fou, ce run serait passé au VERT sans rien exécuter.`
  );
}

describe("Auth — connexion via Auth0", { tags: ["@auth", "@smoke", "@sso"] }, function () {
  beforeEach(function () {
    exigerOuIgnorer(this);
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
