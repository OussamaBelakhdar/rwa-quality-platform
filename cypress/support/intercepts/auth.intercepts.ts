import type { InterceptAlias } from "@support/types";

/**
 * Factories d'intercept pour l'authentification. Chaque factory retourne son
 * alias, pour que l'appelant fasse `cy.wait(interceptLogin())` sans jamais
 * réécrire la chaîne (ARCHITECTURE.md §4, couche L2).
 */
export const interceptLogin = (): InterceptAlias => {
  cy.intercept("POST", "/login").as("loginUser");
  return "@loginUser";
};
