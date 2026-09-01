import { interceptLogin } from "@support/intercepts/auth.intercepts";

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

  it("restaure la session sans rejouer le login", () => {
    // Premier appel : crée la session, ou la restaure si un run précédent
    // l'a mise en cache. Peu importe — ce qui suit ne dépend pas de ce choix.
    cy.login("Heath93");

    // À partir d'ici, tout POST /login serait la preuve que le cache n'a pas
    // servi. Vérifier le nom d'utilisateur ne prouverait rien : il vient de
    // localStorage, restauré par cy.session, pas du serveur.
    const connexion = interceptLogin();
    cy.login("Heath93");

    cy.visit("/");
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
    cy.get(`${connexion}.all`).should("have.length", 0);
  });

  it("lit l'état de la machine d'authentification sans passer par l'UI", () => {
    // `cy.appState` interroge le registre `window.__services__` (ADR-006).
    // Avant login, la machine est dans un état non autorisé ; après, elle est
    // passée par LOGIN. C'est l'assertion la plus directe possible sur
    // l'authentification : elle lit la machine, pas son reflet dans le DOM.
    cy.visit("/signin");
    cy.appState("auth").should("not.equal", "authorized");

    cy.login("Heath93");
    cy.visit("/");
    cy.appState("auth").should("be.oneOf", ["authorized", "refreshing", "updating"]);
  });
});
