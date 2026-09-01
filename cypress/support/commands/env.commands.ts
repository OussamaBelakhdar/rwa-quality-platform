/**
 * Lecture du mot de passe de test, à un seul endroit.
 *
 * Le bloc « lire `defaultPassword`, échouer avec un message si vide » était
 * dupliqué mot pour mot entre `auth.commands.ts` et `data.commands.ts`, au
 * point que le message d'erreur de l'un renvoyait le lecteur vers l'autre.
 * P5 : pas de logique dupliquée entre helpers.
 *
 * `cy.env` et non `Cypress.env` : ce dernier est déprécié depuis Cypress 15.4
 * et fermé par `allowCypressEnv: false` (ADR-001).
 */
export const motDePasseParDefaut = (): Cypress.Chainable<string> =>
  cy.env<{ defaultPassword?: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
    if (!defaultPassword) {
      throw new Error(
        "env.defaultPassword est vide — vérifier SEED_DEFAULT_USER_PASSWORD dans .env, .env.local (chargé en premier), ou CYPRESS_defaultPassword en CI."
      );
    }
    return defaultPassword;
  });
