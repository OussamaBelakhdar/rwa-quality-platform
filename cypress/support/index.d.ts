/// <reference types="cypress" />

import type { DataTestKey } from "./selectors/data-test";
// Type importé de l'application, jamais redéclaré (.claude/rules/typescript.md).
import type { authService } from "../../src/machines/authMachine";

declare global {
  /** Surface de test exposée par l'application sous garde `window.Cypress`. */
  interface Window {
    authService: typeof authService;
  }

  namespace Cypress {
    interface Chainable {
      /** Sélectionne par `data-test`. La clé est typée : faute de frappe = erreur de compilation. */
      getBySel(key: DataTestKey, options?: Partial<Loggable & Timeoutable>): Chainable<JQuery>;
      /** Sélectionne par préfixe de `data-test`, pour les listes à identifiant. */
      getBySelLike(prefix: string, options?: Partial<Loggable & Timeoutable>): Chainable<JQuery>;
      /** Remet la base dans son état seedé via la tâche `db:seed` (L1). */
      seed(scenario?: "default"): Chainable<unknown>;
      /** Connecte un utilisateur par l'API, sans passer par le formulaire. */
      login(username: string): Chainable<void>;
    }
  }
}

export {};
