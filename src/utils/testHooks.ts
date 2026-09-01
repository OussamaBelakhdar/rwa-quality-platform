/**
 * Registre des services XState exposés aux tests (ADR-006).
 *
 * Un seul objet décrit ce que la couche L2 peut atteindre, au lieu des six
 * points d'exposition dispersés hérités de l'amont.
 *
 * GARDE — `process.env.VITE_TEST_HOOKS === "true"`. Vite remplace cette
 * expression par un littéral au build (`vite.config.ts` : `define`), donc le
 * bloc mort est éliminé et le registre est absent de tout build qui n'a pas
 * été construit avec le drapeau. Corollaire assumé : la CI produit deux
 * artefacts, celui qu'on teste et celui qu'on livre.
 *
 * Le drapeau n'est PAS dans `.env` : il vit dans `.env.test`, activé par
 * `--mode test` (scripts `dev:test` et `build:test`).
 *
 * Indépendant du runner, contrairement à `window.Cypress` : Playwright y a
 * accès (semaine 10).
 */

export const testHooksEnabled = (): boolean => process.env.VITE_TEST_HOOKS === "true";

type ServiceRegistry = Record<string, unknown>;

const registry = (): ServiceRegistry => {
  const w = window as Window & { __services__?: ServiceRegistry };
  if (!w.__services__) {
    w.__services__ = {};
  }
  return w.__services__;
};

/**
 * Enregistre un service de durée de vie « module » (singleton démarré à
 * l'import, comme `authService`). À appeler au scope module.
 */
export const registerService = (nom: string, service: unknown): void => {
  if (!testHooksEnabled()) return;
  registry()[nom] = service;
};

/**
 * Enregistre un service porté par un composant, et le retire au démontage.
 *
 * Sans le retrait, la couche L2 pourrait envoyer un événement à un acteur
 * arrêté — sans erreur, sans effet, donc un flake structurel (ADR-006,
 * problème 3). Le contrat côté test est symétrique : une app action ATTEND
 * qu'un service apparaisse, elle ne le suppose jamais présent.
 */
export const registerScopedService = (nom: string, service: unknown): (() => void) => {
  if (!testHooksEnabled()) return () => undefined;
  registry()[nom] = service;
  return () => {
    delete registry()[nom];
  };
};
