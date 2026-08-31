import { interceptLogin } from "@support/intercepts/auth.intercepts";

/**
 * Accès aux services XState de l'application (couche L2).
 *
 * Seul endroit du dépôt autorisé à toucher `cy.window()` : les specs passent
 * par ces app actions (.claude/rules/testing.md #12).
 *
 * Aujourd'hui la lecture se fait sur `window.authService`, exposé par l'amont
 * sous garde `window.Cypress`. ADR-006 prévoit de basculer sur le registre
 * `window.__services__` en semaine 3 : seule cette fonction changera, aucune
 * spec ne bouge.
 */
export const loginByXstate = (username: string, password: string): void => {
  const login = interceptLogin();

  cy.visit("/signin", { log: false });
  cy.window({ log: false }).then((win) => {
    win.authService.send("LOGIN", { username, password });
  });

  // L'état d'auth est persisté dans localStorage par la machine ; attendre la
  // réponse garantit que la transition a eu lieu avant que la spec continue.
  cy.wait(login).its("response.statusCode").should("eq", 200);
};
