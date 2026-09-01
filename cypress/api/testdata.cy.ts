// Niveau API (ADR-004) : ce sont les contrats des routes /testData, pas des
// parcours. Le front n'est pas le sujet — l'ouvrir ne prouverait rien de plus
// et coûterait un chargement de page par assertion.
//
// C'est la couche que la suite entière utilise pour son état initial : si ces
// routes mentent, tous les autres tests mentent avec elles.

const api = (chemin: string) => `${Cypress.expose("apiUrl")}/testData${chemin}`;

describe("API — routes /testData", { tags: ["@api", "@regression"] }, () => {
  it("réinitialise sur la graine par défaut", () => {
    cy.request("POST", api("/seed/default")).its("status").should("eq", 200);
    cy.request(api("/users")).its("body.results").should("have.length.greaterThan", 0);
  });

  it("vide réellement la base avec le scénario empty", () => {
    cy.request("POST", api("/seed/empty")).its("status").should("eq", 200);
    cy.request(api("/users")).its("body.results").should("have.length", 0);
    cy.request(api("/transactions")).its("body.results").should("have.length", 0);
  });

  it("refuse un scénario inconnu au lieu de seeder au hasard", () => {
    cy.request({ method: "POST", url: api("/seed/nimporte-quoi"), failOnStatusCode: false }).should(
      (reponse) => {
        expect(reponse.status, "la route refuse").to.equal(400);
        expect(reponse.body.error, "et dit ce qu'elle accepte").to.contain("default, empty");
      }
    );
  });

  it("crée un utilisateur sans compte bancaire quand on le demande", () => {
    cy.request("POST", api("/seed/default"));

    // `cy.env` et non `Cypress.env` : ce dernier est déprécié depuis Cypress
    // 15.4 et fermé par `allowCypressEnv: false` (ADR-001).
    cy.env<{ defaultPassword?: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
      cy.request(api("/bankaccounts"))
        .its("body.results")
        .then((avant: unknown[]) => {
          cy.request("POST", api("/user"), {
            firstName: "Sans",
            lastName: "Compte",
            username: `sans_compte_${Date.now()}`,
            password: defaultPassword,
            withBankAccount: false,
          })
            .its("status")
            .should("eq", 201);

          // Le nombre de comptes n'a pas bougé : c'est ce qui déclenche
          // l'onboarding, et c'est la seule assertion qui le prouve.
          cy.request(api("/bankaccounts")).its("body.results").should("have.length", avant.length);
        });
    });
  });
});
