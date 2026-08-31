/**
 * Types partagés de la couche L2. Vivent ici plutôt que dans le fichier qui
 * s'en sert en premier : sinon `transactions.intercepts.ts` devrait importer
 * depuis `auth.intercepts.ts` pour un type qui n'a rien d'authentification.
 */

/** Alias d'intercept, au format exigé par `cy.wait`. Une factory qui oublie le `@` ne compile pas. */
export type InterceptAlias = `@${string}`;

/**
 * Scénarios de seed publiés par ARCHITECTURE.md §4 (couche L2).
 * Seul `default` est livré ; `empty` et `rich` arrivent en semaine 4.
 */
export type SeedScenario = "empty" | "default" | "rich";

/** Préfixes légitimes de `data-test`, pour `cy.getBySelLike`. */
export type DataTestPrefix =
  | "transaction-item"
  | "bankaccount-list-item"
  | "notification-list-item";
