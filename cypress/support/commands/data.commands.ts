import type { SeedScenario } from "@support/types";

/**
 * Remet la base dans son état seedé. Passe par la tâche `db:seed`, qui appelle
 * `POST /testData/seed` : le backend Express est le seul écrivain lowdb
 * (ARCHITECTURE.md §4, couche L1 — ne jamais écrire `data/database.json`
 * derrière le serveur, qui tient son instance en mémoire).
 *
 * Le type accepte les trois scénarios publiés par l'architecture, mais seul
 * `default` est livré : `empty` et `rich` demandent des endpoints dédiés,
 * livrables de la semaine 4. La garde ci-dessous est donc **atteignable** —
 * `cy.seed("empty")` compile et échoue avec un message qui dit pourquoi,
 * plutôt que de silencieusement seeder autre chose.
 */
Cypress.Commands.add("seed", (scenario: SeedScenario = "default") => {
  if (scenario !== "default") {
    throw new Error(
      `cy.seed('${scenario}') n'est pas encore livré — endpoints /testData dédiés, semaine 4 (docs/PLAN.md).`
    );
  }
  return cy.task("db:seed", null, { log: false });
});

export {};
