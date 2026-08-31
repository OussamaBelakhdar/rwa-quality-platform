/**
 * Remet la base dans son état seedé. Passe par la tâche `db:seed`, qui appelle
 * `POST /testData/seed` : le backend Express est le seul écrivain lowdb
 * (ARCHITECTURE.md §4, couche L1 — ne jamais écrire `data/database.json`
 * derrière le serveur, qui tient son instance en mémoire).
 *
 * La signature accepte déjà un scénario pour que les specs n'aient pas à changer
 * quand la semaine 4 livrera `empty` et `rich` via des endpoints dédiés.
 */
Cypress.Commands.add("seed", (scenario: "default" = "default") => {
  if (scenario !== "default") {
    throw new Error(
      `cy.seed('${scenario}') n'est pas encore disponible — livré en semaine 4 (voir docs/PLAN.md).`
    );
  }
  return cy.task("db:seed", null, { log: false });
});

export {};
