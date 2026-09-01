import { userBuilder } from "../fixtures/builders/user.builder";
import type { SeedScenario } from "../support/types";

// Niveau API (ADR-004) : contrats des routes /testData, pas des parcours. Le
// front n'est pas le sujet — l'ouvrir ne prouverait rien de plus.
//
// C'est la couche dont dépend l'état initial de toute la suite : si ces routes
// mentent, tous les autres tests mentent avec elles.

const api = (chemin: string) => `${Cypress.expose("apiUrl")}/testData${chemin}`;

const comptes = () => cy.request(api("/bankaccounts")).its("body.results");

describe(
  "Données de test — contrats des routes /testData",
  // `@seeding` est le DOMAINE ; `@api` décrivait le niveau, pas le domaine, et
  // la règle #6 demande les deux (le hook ne vérifie que le niveau).
  { tags: ["@seeding", "@regression"] },
  () => {
    beforeEach(() => {
      cy.seed("default");
    });

    // Un de ces tests laisse volontairement la base vide. Le `beforeEach`
    // ci-dessus protège les tests suivants de CE fichier ; ce `after` protège la
    // suite entière, sans dépendre de l'ordre des `it` ni de leur existence.
    after(() => {
      cy.seed("default");
    });

    it("réinitialise sur la graine par défaut", () => {
      cy.request(api("/users")).its("body.results").should("have.length.greaterThan", 0);
    });

    it("vide réellement la base avec le scénario empty", () => {
      cy.seed("empty");
      cy.request(api("/users")).its("body.results").should("have.length", 0);
      cy.request(api("/transactions")).its("body.results").should("have.length", 0);
    });

    it("refuse un scénario inconnu au lieu de seeder au hasard", () => {
      cy.request({
        method: "POST",
        url: api("/seed/nimporte-quoi"),
        failOnStatusCode: false,
      }).should((reponse) => {
        expect(reponse.status, "la route refuse").to.equal(400);
        expect(reponse.body.error, "et dit ce qu'elle accepte").to.contain("default, empty");
      });
    });

    it("crée un compte bancaire quand withBankAccount vaut true", () => {
      comptes().then((avant: unknown[]) => {
        cy.createUser(userBuilder().withBankAccount().build());
        // La moitié POSITIVE du contrat. Sans elle, une route qui ne créerait
        // JAMAIS de compte passerait le test négatif ci-dessous au vert.
        comptes().should("have.length", avant.length + 1);
      });
    });

    it("n'en crée aucun quand withBankAccount vaut false", () => {
      comptes().then((avant: unknown[]) => {
        cy.createUser(userBuilder().withoutBankAccount().build());
        comptes().should("have.length", avant.length);
      });
    });

    it("refuse un username déjà pris au lieu de créer un homonyme", () => {
      const nouveau = userBuilder().build();

      cy.createUser(nouveau).then((cree) => {
        expect(cree.username, "l'utilisateur est bien créé").to.equal(nouveau.username);

        // Sans cette garde le backend créait un SECOND utilisateur homonyme, et
        // POST /login en retournait un au hasard : le test se serait authentifié
        // sous une identité qu'il n'avait pas créée. Vérifié avant correction.
        cy.env<{ defaultPassword?: string }>(["defaultPassword"]).then(({ defaultPassword }) => {
          cy.request({
            method: "POST",
            url: api("/user"),
            body: { ...nouveau, password: defaultPassword },
            failOnStatusCode: false,
          }).should((reponse) => {
            expect(reponse.status, "le doublon est refusé").to.equal(409);
            expect(reponse.body.error, "et la raison est dite").to.contain(nouveau.username);
          });
        });

        cy.request(api("/users"))
          .its("body.results")
          .should((users: { username: string }[]) => {
            const homonymes = users.filter((u) => u.username === nouveau.username);
            expect(homonymes, "un seul utilisateur porte ce nom").to.have.length(1);
          });
      });
    });

    it("publie la liste des scénarios, source unique du type SeedScenario", () => {
      // `SeedScenario` recopiait la liste du backend : ajouter un scénario
      // d'un seul côté compilait sans que rien ne le signale. Ce test compare
      // les deux, et c'est le backend qui fait foi.
      const attendus: SeedScenario[] = ["default", "empty"];

      cy.request(api("/seed/scenarios"))
        .its("body.scenarios")
        .should((publies: string[]) => {
          expect([...publies].sort(), "le backend publie exactement le type").to.deep.equal(
            [...attendus].sort()
          );
        });
    });

    it("refuse une traversée de chemin déguisée en scénario", () => {
      cy.request({
        method: "POST",
        url: api("/seed/..%2F..%2Fpackage"),
        failOnStatusCode: false,
      })
        .its("status")
        .should("eq", 400);
    });

    it("nomme les champs manquants au lieu de planter en 500", () => {
      cy.request({
        method: "POST",
        url: api("/user"),
        body: { username: "incomplet" },
        failOnStatusCode: false,
      }).should((reponse) => {
        expect(reponse.status, "400 et non 500").to.equal(400);
        expect(reponse.body.error, "les champs manquants sont nommés").to.contain("password");
      });
    });
  }
);
