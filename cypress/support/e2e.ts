import "@cypress/code-coverage/support";
import "./commands";
import { register as registerCypressGrep } from "@cypress/grep";

// Filtrage par tag : `yarn cy:run --env grep=@smoke`.
// La règle .claude/rules/testing.md #6 impose un tag de domaine et un tag de
// niveau sur chaque describe ; sans ce plugin la règle serait déclarative.
registerCypressGrep();

beforeEach(() => {
  // Middleware conservé de l'upstream : sans lui, le serveur répond 304 sur les
  // requêtes API et les assertions portent sur une réponse mise en cache.
  // C'est une mesure anti-flake d'infrastructure, pas un test — elle reste.
  cy.intercept(
    { url: `${Cypress.expose("apiUrl")}/**`, middleware: true },
    (req) => delete req.headers["if-none-match"]
  );
});
