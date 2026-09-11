/**
 * Lecture d'identifiants dans une liste — couche L2.
 *
 * ── Pourquoi cette commande existe ──
 * Deux specs de la semaine 10 extrayaient l'identifiant du premier élément
 * d'une liste par la même séquence de quatre lignes :
 *
 *     .first().invoke("attr", "data-test").then((cle) => String(cle).replace(prefixe, ""))
 *
 * Dupliquée, elle poussait le `it` de `notifications/lecture.cy.ts` à 37 lignes
 * — au-delà des 25 de la règle #5. Ce n'était pas une question de style : la
 * règle existe parce qu'un `it` long mélange la préparation et le comportement,
 * et c'est exactement ce qui se passait ici.
 *
 * La règle #4 dit où va la préparation quand elle déborde : en L2. La voici.
 */
import type { DataTestPrefix } from "@support/types";

Cypress.Commands.add("premierIdDe", (prefixe: DataTestPrefix) => {
  // `.should("exist")` avant la lecture : sans lui, `invoke("attr")` prendrait
  // un INSTANTANÉ d'une liste encore en cours de rendu et rendrait `undefined`.
  // C'est la même erreur que celle mesurée sur le compteur de notifications,
  // qui valait `''` parce qu'elle était lue trop tôt.
  return cy
    .getBySelLike(prefixe)
    .first()
    .should("exist")
    .invoke("attr", "data-test")
    .then((cle) => String(cle).replace(`${prefixe}-`, ""));
});

export {};
