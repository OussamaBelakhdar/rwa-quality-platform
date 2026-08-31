/// <reference types="cypress" />

// Declaration merging des custom commands (L2).
// Reconstruit au fil des semaines 2-3 ; l'ancien contrat de l'upstream est
// récupérable via `git show upstream/develop:cypress/global.d.ts`.
declare global {
  namespace Cypress {
    interface Chainable {}
  }
}

export {};
