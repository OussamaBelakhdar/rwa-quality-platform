import type { DataTestKey } from "@support/selectors/data-test";

/**
 * Sélection par `data-test`. La clé est typée : une faute de frappe est une
 * erreur de compilation (ARCHITECTURE.md §4, couche L2).
 */
Cypress.Commands.add("getBySel", (key: DataTestKey, ...args: unknown[]) =>
  cy.get(`[data-test=${key}]`, ...(args as []))
);

/** Variante « commence par », pour les listes dont la clé porte un identifiant. */
Cypress.Commands.add("getBySelLike", (prefix: string, ...args: unknown[]) =>
  cy.get(`[data-test*=${prefix}]`, ...(args as []))
);

export {};
