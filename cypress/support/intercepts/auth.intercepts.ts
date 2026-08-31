/**
 * Factories d'intercept pour l'authentification. Chaque factory retourne son
 * alias, pour que l'appelant fasse `cy.wait(interceptLogin())` sans jamais
 * réécrire la chaîne (ARCHITECTURE.md §4, couche L2).
 *
 * Le type `InterceptAlias` est le littéral attendu par `cy.wait` : une factory
 * qui oublierait le `@` ne compilerait pas.
 */
export type InterceptAlias = `@${string}`;

export const interceptLogin = (): InterceptAlias => {
  cy.intercept("POST", "/login").as("loginUser");
  return "@loginUser";
};

export const interceptCheckAuth = (): InterceptAlias => {
  cy.intercept("GET", "/checkAuth").as("checkAuth");
  return "@checkAuth";
};
