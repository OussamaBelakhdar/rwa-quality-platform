import { loginByXstate } from "@support/app-actions/xstate.actions";

/**
 * Connecte un utilisateur sans passer par le formulaire (P2 : l'UI ne sert qu'à
 * tester l'UI). Un seul test parcourt `/signin`, tout le reste passe par ici.
 *
 * Le mot de passe est lu par `cy.env()` et non `Cypress.env()` : ce dernier est
 * déprécié depuis Cypress 15.4 et, tant qu'`allowCypressEnv` reste ouvert,
 * lisible par n'importe quel code de la page. `allowCypressEnv: false` ferme
 * cette porte, `cy.env()` garde la valeur côté runner (ADR-001).
 *
 * Pourquoi une app action et pas un simple `cy.request('/login')` : l'état
 * d'authentification de la RWA ne vit pas dans le cookie seul, il est persisté
 * par la machine XState dans `localStorage.authState` et rechargé au démarrage
 * (`src/machines/authMachine.ts:265-281`). Un login purement HTTP laisse donc
 * l'application déconnectée.
 *
 * `cy.session` viendra en semaine 2, avec la mesure avant/après.
 */
Cypress.Commands.add("login", (username: string) => {
  cy.env<{ defaultPassword: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
    if (!defaultPassword) {
      throw new Error(
        "env.defaultPassword est vide — vérifier SEED_DEFAULT_USER_PASSWORD dans .env."
      );
    }
    loginByXstate(username, defaultPassword);
  });
});

export {};
