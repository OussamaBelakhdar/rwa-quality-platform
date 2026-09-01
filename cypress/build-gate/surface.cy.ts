// Gate de surface de test — exécuté par `yarn check:surface`, JAMAIS par la
// suite (hors specPattern).
//
// Il tourne contre un build de PRODUCTION servi par `vite preview`, sans
// supportFile : aucune commande du projet n'est chargée, donc rien ne peut
// masquer ce qu'on vérifie.
//
// ADR-006 promettait ce contrôle pour la semaine 6, après avoir démontré qu'un
// `grep` du bundle produirait un faux positif permanent : `__services__` EST
// présent dans le bundle, mais la garde est fausse à l'exécution. Seule une
// vérification au runtime dit la vérité.

describe("Gate — le build de production n'expose aucune surface de test", () => {
  it("ne pose pas window.__services__", () => {
    cy.visit("/");
    cy.window().should((win) => {
      expect(
        "__services__" in win,
        "un build sans VITE_TEST_HOOKS ne doit pas porter le registre XState (ADR-006)"
      ).to.be.false;
    });
  });
});
