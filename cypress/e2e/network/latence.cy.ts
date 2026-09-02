import { delayPublicTransactions } from "@support/intercepts/transactions.intercepts";
import type { ReponseTransactions } from "@fixtures/builders/transaction.builder";

// Niveau E2E : l'indicateur de chargement dépend de l'état `loading` d'une
// machine XState alimentée par une vraie requête. Un test de composant le
// prouverait sur une prop `isLoading` fixée à la main — c'est-à-dire sur rien.

describe("Réseau — latence injectée", { tags: ["@network", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
  });

  it("le squelette de chargement reste affiché tant que la réponse tarde", () => {
    // Sans retard, la fenêtre où le squelette existe dépend de la vitesse de
    // la machine : l'assertion passerait ou non selon la charge. Ralentir la
    // réponse rend la fenêtre déterministe — c'est l'inverse d'un cy.wait(ms),
    // qui rendrait le TEST lent sans rendre l'application prévisible.
    const flux = delayPublicTransactions(1500);

    cy.visit("/");
    cy.getBySel("list-skeleton").should("be.visible");

    cy.wait(flux);
    cy.getBySel("list-skeleton").should("not.exist");
  });

  it("l'assertion avec retry absorbe la latence sans attente fixe", () => {
    const flux = delayPublicTransactions(2500);

    cy.visit("/");

    // Aucun `cy.wait` ici : la commande est rejouée jusqu'à ce que la ligne
    // paraisse. Le retard de 2,5 s tient sous le `defaultCommandTimeout`, donc
    // le test passe sans qu'aucune durée ne soit écrite dans la spec (P4).
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);

    // Le `cy.wait` ne vient qu'APRÈS : à ce stade la réponse est déjà arrivée,
    // il ne sert plus qu'à en inspecter le corps.
    cy.wait(flux).then(({ response }) => {
      const corps = response?.body as ReponseTransactions;
      expect(corps.results.length, "la réponse retardée est arrivée entière").to.be.greaterThan(0);
    });
  });
});
