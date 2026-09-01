import { appState, type ServiceName } from "@support/app-actions/xstate.actions";

/**
 * Lit l'état d'une machine XState depuis une spec, sans toucher `cy.window()`
 * (.claude/rules/testing.md #12). Interface publiée par ARCHITECTURE.md §4.
 */
Cypress.Commands.add("appState", (nom: ServiceName) => appState(nom));

export {};
