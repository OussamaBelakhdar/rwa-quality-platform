/// <reference types="cypress" />

import type { DataTestKey } from "./selectors/data-test";
import type { DataTestPrefix, SeedScenario, ServiceXState } from "./types";
import type { ServiceName } from "./app-actions/xstate.actions";
import type { NouvelleTransaction } from "../plugins/db.task";
import type { UtilisateurSansMotDePasse } from "../fixtures/builders/user.builder";
import type { Transaction, User } from "../../src/models";
// Type importé de l'application, jamais redéclaré (.claude/rules/typescript.md).
import type { authService } from "../../src/machines/authMachine";
import type { publicTransactionsMachine } from "../../src/machines/publicTransactionsMachine";
import type { Interpreter } from "xstate";

declare global {
  /** Surface de test exposée par l'application sous garde `window.Cypress`. */
  interface Window {
    /**
     * Exposé par l'amont **uniquement** sous garde `window.Cypress`, et
     * seulement après évaluation du bundle. Optionnel par conception : le type
     * force l'attente au lieu de la confier à la discipline (ADR-006).
     */
    authService?: typeof authService;
    /**
     * Registre du projet (ADR-006). Peuplé uniquement si `VITE_TEST_HOOKS`
     * était vrai au build. Optionnel par conception : le type force l'attente
     * au lieu de la confier à la discipline.
     */
    __services__?: Partial<Record<ServiceName, ServiceXState>>;
    /** Enregistré par TransactionPublicList sous garde `window.Cypress`, et seulement pendant que le composant est monté. */
    publicTransactionService?: Interpreter<
      (typeof publicTransactionsMachine)["context"],
      (typeof publicTransactionsMachine)["schema"],
      never
    >;
  }

  namespace Cypress {
    interface Chainable {
      /** Sélectionne par `data-test`. La clé est typée : faute de frappe = erreur de compilation. */
      getBySel(key: DataTestKey, options?: Partial<Loggable & Timeoutable>): Chainable<JQuery>;
      /** Sélectionne par préfixe de `data-test`, pour les listes à identifiant. */
      getBySelLike(
        prefix: DataTestPrefix,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<JQuery>;
      /** Sélectionne une clé `data-test` dynamique : préfixe typé, identifiant libre. */
      getBySelWithId(
        prefix: DataTestPrefix,
        id: string,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<JQuery>;
      /** Remet la base dans son état seedé via la tâche `db:seed` (L1). */
      seed(scenario?: SeedScenario): Chainable<null>;
      /** Crée un utilisateur ; `withBankAccount: false` déclenche l'onboarding. */
      createUser(details: UtilisateurSansMotDePasse): Chainable<User>;
      /** Crée une transaction entre deux utilisateurs, sans passer par l'UI. */
      createTransaction(details: NouvelleTransaction): Chainable<Transaction>;
      /** Connecte un utilisateur par l'API, sans passer par le formulaire. */
      login(username: string): Chainable<void>;
      /** Lit l'état courant d'une machine XState (ADR-006). */
      appState(nom: ServiceName): Chainable<string>;
    }
  }
}

export {};
