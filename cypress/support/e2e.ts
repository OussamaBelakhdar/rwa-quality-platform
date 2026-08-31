import "@cypress/code-coverage/support";
import "./commands";

beforeEach(() => {
  // Middleware conservé de l'upstream : sans lui, le serveur répond 304 sur les
  // requêtes API et les assertions portent sur une réponse mise en cache.
  // C'est une mesure anti-flake d'infrastructure, pas un test — elle reste.
  cy.intercept(
    { url: `${Cypress.expose("apiUrl")}/**`, middleware: true },
    (req) => delete req.headers["if-none-match"]
  );
});
