// Démonstration de `Cypress.stop()`, hors du specPattern par conception.
//
// `Cypress.stop()` interrompt le runner : l'inclure dans la suite automatisée
// arrêterait l'exécution. C'est pourquoi la spec 04 se contente d'en vérifier
// le contrat, et pourquoi la démonstration réelle vit ici, exécutable à la
// demande :
//
//     yarn cy:demo:stop
//
// PIÈGE VÉRIFIÉ — `Cypress.stop()` n'est PAS une commande de la file. Écrit
// directement dans le corps du test, il s'exécute à la *collecte* et arrête le
// runner avant que `cy.seed`, `cy.login` ou `cy.visit` n'aient tourné : on
// obtient une page blanche au lieu d'un état à inspecter. Mesuré : 96 ms, zéro
// commande exécutée. C'est exactement la leçon de `00-foundations/01`, appliquée
// à une API du runner.
//
// Il faut donc l'appeler DEPUIS la file, via `cy.then`.

describe("Démonstration — Cypress.stop", { tags: ["@manual"] }, () => {
  it("interrompt le runner sur un état chargé", () => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/");
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);

    // Dans la file : tout ce qui précède a réellement tourné. Le runner
    // s'arrête ici, DOM et Command Log inspectables.
    cy.then(() => Cypress.stop());
  });
});
