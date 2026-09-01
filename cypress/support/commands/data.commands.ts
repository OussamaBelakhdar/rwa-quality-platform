import type { NouvelleTransaction } from "@plugins/db.task";
import type { UtilisateurSansMotDePasse } from "../../fixtures/builders/user.builder";
import type { SeedScenario } from "@support/types";

/**
 * Remet la base dans l'état d'une graine nommée, via la tâche `db:reset` qui
 * appelle `POST /testData/seed/:scenario`. Le backend Express est le seul
 * écrivain lowdb (ARCHITECTURE.md §4, couche L1).
 */
Cypress.Commands.add("seed", (scenario: SeedScenario = "default") =>
  cy.task("db:reset", scenario, { log: false })
);

/**
 * Crée un utilisateur. `withBankAccount: false` donne un utilisateur qui
 * déclenche le dialogue d'onboarding — les cinq utilisateurs de la graine par
 * défaut en ont tous un, donc ce cas était intestable avant la semaine 4.
 */
Cypress.Commands.add("createUser", (details: UtilisateurSansMotDePasse) =>
  cy.env<{ defaultPassword?: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
    if (!defaultPassword) {
      throw new Error("env.defaultPassword est vide — voir auth.commands.ts pour les sources.");
    }
    // Le mot de passe est injecté ici et non dans le builder : `cy.login`
    // utilise le même, et un mot de passe en dur est interdit (règle #3).
    return cy.task("db:createUser", { ...details, password: defaultPassword }, { log: false });
  })
);

/** Crée une transaction entre deux utilisateurs, sans passer par l'UI. */
Cypress.Commands.add("createTransaction", (details: NouvelleTransaction) =>
  cy.task("db:createTransaction", details, { log: false })
);

export {};
