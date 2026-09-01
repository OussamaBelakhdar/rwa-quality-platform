import type { ServiceName } from "@support/app-actions/xstate.actions";

/**
 * Lit l'état d'une machine XState, de façon RETRIABLE.
 *
 * Toute la chaîne est composée de queries — `cy.window`, `.its`, `.invoke` —
 * donc Cypress la rejoue entière à chaque tentative jusqu'à ce que
 * l'assertion qui suit passe. Une première version bâtie sur `.then` capturait
 * la valeur une seule fois : un `.should()` derrière elle ne relisait jamais
 * la machine, et une transition asynchrone se soldait par 4 s d'attente
 * inutile puis un échec. C'est exactement ce qu'enseigne `00-foundations/05`.
 *
 * `.its("__services__").its(nom)` en deux étapes et non `.its("__services__.x")` :
 * le parcours de chemin ne franchit pas un registre absent au premier essai.
 * `.invoke("getSnapshot")` et non `.its("state")` : sur un Interpreter XState
 * v4, `state` est un getter de prototype que `.its` ne traverse pas.
 */
Cypress.Commands.add("appState", (nom: ServiceName) =>
  cy.window({ log: false }).its("__services__").its(nom).invoke("getSnapshot").its("value")
);

export {};
