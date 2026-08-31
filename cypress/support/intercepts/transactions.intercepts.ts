import type { InterceptAlias } from "@support/types";

/**
 * Factories d'intercept pour les transactions (ARCHITECTURE.md §4, couche L2).
 *
 * Les noms suivent le **matcher**, pas l'intention : `/transactions*` est
 * l'endpoint générique du flux personnel comme des filtres. Promettre
 * « personal » dans le nom ferait résoudre `cy.wait` sur la mauvaise requête
 * le jour où une seconde partirait de la même page.
 */
export const interceptTransactions = (): InterceptAlias => {
  cy.intercept("GET", "/transactions*").as("transactions");
  return "@transactions";
};

export const interceptPublicTransactions = (): InterceptAlias => {
  cy.intercept("GET", "/transactions/public*").as("publicTransactions");
  return "@publicTransactions";
};
