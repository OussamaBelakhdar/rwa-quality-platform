import type { DataTestKey } from "@support/selectors/data-test";
import type { DataTestPrefix } from "@support/types";

type SelectorOptions = Partial<Cypress.Loggable & Cypress.Timeoutable>;

/**
 * Sélection par `data-test` exact. La clé est typée : une faute de frappe est
 * une erreur de compilation (ARCHITECTURE.md §4, couche L2).
 */
Cypress.Commands.add("getBySel", (key: DataTestKey, options?: SelectorOptions) =>
  cy.get(`[data-test="${key}"]`, options)
);

/**
 * Sélection par **préfixe** de `data-test` (`^=`), pour les listes dont la clé
 * porte un identifiant : `transaction-item-<id>`.
 *
 * `^=` et non `*=` : avec « contient », `getBySelLike("transaction-list")`
 * ramènerait aussi `transaction-list-filter-amount-range` et six autres clés.
 *
 * Commande **parent** : elle requête le document entier et ignore le sujet
 * précédent. La chaîner derrière un `getBySel` ne restreint donc rien —
 * utiliser `.within()` pour cela.
 */
Cypress.Commands.add("getBySelLike", (prefix: DataTestPrefix, options?: SelectorOptions) =>
  cy.get(`[data-test^="${prefix}"]`, options)
);

/**
 * Sélection d'une clé `data-test` DYNAMIQUE : préfixe typé, identifiant libre.
 * Rend `transaction-item-<id>` atteignable sans écrire le sélecteur en dur et
 * sans cast — les deux étant interdits (règle #9, rules/typescript.md).
 *
 * `getBySelLike` rend la collection ; celle-ci vise UNE ligne précise, ce qui
 * permet d'asserter sur l'entité qu'un test vient de créer plutôt que sur
 * « au moins un élément contient ce texte ».
 */
Cypress.Commands.add(
  "getBySelWithId",
  (prefixe: DataTestPrefix, id: string, options?: SelectorOptions) =>
    cy.get(`[data-test="${prefixe}-${id}"]`, options)
);

export {};
