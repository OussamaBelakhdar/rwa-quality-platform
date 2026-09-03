import type { DataSchema } from "../../src/machines/dataMachine";

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
  | "transaction-amount"
  // Trois clés du DÉTAIL d'une transaction. À ne pas confondre avec les clés
  // statiques `transaction-like-count` et `transaction-comment-count` de la
  // LISTE : celles-ci portent l'identifiant de la transaction.
  | "transaction-comment-input"
  | "transaction-like-button"
  | "transaction-like-count"
  | "user-list-item"
  | "bankaccount-list-item"
  | "notification-list-item";

/**
 * Forme minimale d'un service XState v4 telle que la couche L2 l'utilise.
 * Volontairement structurelle et non importée de `xstate` : L2 n'a besoin que
 * de ces deux membres, et ADR-006 refuse de coupler le code de test aux
 * internes de la machine.
 */
/**
 * Valeur d'état d'une machine XState v4 : une chaîne pour un état plat, un
 * OBJET pour un état imbriqué — `{ success: "withoutData" }`.
 *
 * Ce type disait `string` jusqu'en semaine 5, au motif que « les machines de
 * cette application ont toutes des états plats ». C'était faux :
 * `dataMachine.success` a trois sous-états (`unknown`, `withData`,
 * `withoutData`, voir l'état `success` de `dataMachine`), et il porte les quatre listes
 * de l'application. `cy.appState` rendait donc un objet sous un type `string`,
 * en silence — exactement ce que le commentaire d'origine promettait d'éviter.
 * Constaté par un test qui stube une liste vide.
 */
export type EtatXState = string | { [cle: string]: EtatXState };

/**
 * Valeur d'état DÉRIVÉE d'un schéma de machine, jamais recopiée.
 *
 * Applique la règle XState : une feuille rend son nom, un état composite rend
 * `{ parent: enfant }`. Le type suit donc la machine — ajouter un sous-état à
 * `success` dans `src/` fait échouer à la compilation toute spec qui l'ignore,
 * au lieu de la laisser échouer après 4 s de retry.
 */
type ValeurDeSchema<S> = S extends { states: infer Etats }
  ? {
      [K in Extract<keyof Etats, string>]: Etats[K] extends { states: infer SousEtats }
        ? { [P in K]: Extract<keyof SousEtats, string> }
        : K;
    }[Extract<keyof Etats, string>]
  : never;

/**
 * États observables des six services bâtis sur `dataMachine` :
 * `notifications`, `bankAccounts`, `publicTransactions`,
 * `contactsTransactions`, `personalTransactions`, `createTransaction`.
 *
 * Les trois autres services du registre — `auth`, `snackbar`, `userOnboarding` —
 * ont des états plats et rendent une simple chaîne.
 */
export type EtatDonnees = ValeurDeSchema<DataSchema>;

export interface ServiceXState {
  getSnapshot(): { value: EtatXState };
  send(evenement: string, charge?: Record<string, unknown>): void;
}
