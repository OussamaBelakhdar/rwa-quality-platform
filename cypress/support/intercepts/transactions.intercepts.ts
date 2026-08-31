import type { InterceptAlias } from "@support/intercepts/auth.intercepts";

/**
 * Factories d'intercept pour les transactions. Chaque factory retourne son
 * alias (ARCHITECTURE.md §4, couche L2) : la spec ne réécrit jamais la chaîne.
 */
export const interceptPersonalTransactions = (): InterceptAlias => {
  cy.intercept("GET", "/transactions*").as("personalTransactions");
  return "@personalTransactions";
};

export const interceptPublicTransactions = (): InterceptAlias => {
  cy.intercept("GET", "/transactions/public*").as("publicTransactions");
  return "@publicTransactions";
};
