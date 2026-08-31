import { interceptLogin } from "@support/intercepts/auth.intercepts";

/**
 * Accès aux services XState de l'application (couche L2).
 *
 * Seul endroit du dépôt autorisé à toucher `cy.window()` : les specs passent
 * par ces app actions (.claude/rules/testing.md #12).
 *
 * DETTE — bascule sur `window.__services__` sous garde `VITE_TEST_HOOKS`
 * (ADR-006, semaine 3). Cette implémentation lit `window.authService`, exposé
 * par l'amont sous garde `window.Cypress`, ce que la règle #12 et
 * ARCHITECTURE.md §4 désignent comme n'étant PAS la voie d'accès du projet.
 * Livré avant l'ADR qui la remplace ; seule cette fonction changera, aucune
 * spec ne bouge.
 */
export const loginByXstate = (username: string, password: string): void => {
  const login = interceptLogin();

  cy.visit("/signin", { log: false });

  // `cy.window()` se résout dès que l'objet window existe — ce qui peut
  // précéder l'évaluation du bundle. Déréférencer `authService` directement
  // lèverait un TypeError non retriable. `.should("have.property", …)` rejoue
  // jusqu'à ce que le service soit là : c'est le contrat « une app action
  // attend qu'un service apparaisse » (règle #12, ADR-006).
  cy.window({ log: false })
    .should("have.property", "authService")
    .invoke("send", "LOGIN", { username, password });

  cy.wait(login).its("response.statusCode").should("eq", 200);
};
