/**
 * Types partagés de la couche L2. Vivent ici plutôt que dans le fichier qui
 * s'en sert en premier : sinon `transactions.intercepts.ts` devrait importer
 * depuis `auth.intercepts.ts` pour un type qui n'a rien d'authentification.
 */

/** Alias d'intercept, au format exigé par `cy.wait`. Une factory qui oublie le `@` ne compile pas. */
export type InterceptAlias = `@${string}`;

/**
 * Scénarios de seed. Chacun correspond à un fichier de graine réel de `data/`
 * (`database-seed.json`, `empty-seed.json`).
 *
 * `rich` a été retiré du contrat publié en semaine 4 : un scénario « riche »
 * est un blob opaque dont personne ne connaît le contenu sans l'ouvrir. Les
 * endpoints granulaires `db:createUser` et `db:createTransaction` couvrent le
 * même besoin de façon composable et lisible dans la spec qui les appelle.
 */
export type SeedScenario = "empty" | "default";

/** Préfixes légitimes de `data-test`, pour `cy.getBySelLike`. */
export type DataTestPrefix =
  | "transaction-item"
  | "bankaccount-list-item"
  | "notification-list-item";

/**
 * Forme minimale d'un service XState v4 telle que la couche L2 l'utilise.
 * Volontairement structurelle et non importée de `xstate` : L2 n'a besoin que
 * de ces deux membres, et ADR-006 refuse de coupler le code de test aux
 * internes de la machine.
 */
export interface ServiceXState {
  getSnapshot(): { value: unknown };
  send(evenement: string, charge?: Record<string, unknown>): void;
}
